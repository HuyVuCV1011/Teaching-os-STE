import io
import time
import logging
import traceback
from typing import Dict, Any, List, Tuple
from sqlalchemy import text
from supabase import create_client, Client
from pypdf import PdfReader

# Configure logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("rubricore_worker")

# Try importing OCR and Token count libraries with fallbacks
try:
    import pytesseract
    from pdf2image import convert_from_bytes
    HAS_OCR = True
except ImportError:
    HAS_OCR = False
    logger.warning("OCR libraries (pytesseract/pdf2image) not installed. OCR fallbacks will be skipped.")

try:
    import tiktoken
    HAS_TIKTOKEN = True
except ImportError:
    HAS_TIKTOKEN = False
    logger.warning("tiktoken library not installed. Estimating token counts using word counts.")

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.ai.ollama import OllamaGradingProvider

# Load application configurations
settings = get_settings()

# Initialize Supabase client if keys are available
supabase_client: Client = None
if settings.supabase_url and settings.supabase_service_role_key:
    supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    logger.info("Supabase client initialized successfully with service role credentials.")
else:
    logger.warning("Supabase URL or Service Role Key missing in .env config. File downloads will fail.")


def extract_ocr_from_pdf_bytes(pdf_bytes: bytes) -> Tuple[str, str, float]:
    """
    Attempts to convert PDF pages to images and run Tesseract OCR on them.
    Returns: (extracted_text, parser_type, parse_confidence)
    """
    if not HAS_OCR:
        return "", "pypdf_empty", 0.0

    try:
        # Convert first 5 pages to images to avoid high memory usage and time limit constraints
        images = convert_from_bytes(pdf_bytes, last_page=5)
        text_pages = []
        for i, img in enumerate(images):
            # Run OCR on page
            text = pytesseract.image_to_string(img)
            text_pages.append(text)
            logger.info(f"OCR successfully parsed page {i+1} of PDF file.")
        
        extracted_text = "\n\n".join(text_pages)
        if len(extracted_text.strip()) >= 300:
            return extracted_text, "ocr_tesseract", 0.85
        return extracted_text, "ocr_tesseract_failed", 0.1
    except Exception as e:
        logger.error(f"OCR fallback processing encountered error: {traceback.format_exc()}")
        return "", "ocr_error", 0.0


def parse_file_content(file_bytes: bytes, filename: str, content_type: str | None) -> Tuple[str, str, float]:
    """
    Parses downloaded file content by routing based on filename extension or MIME-type.
    Returns a tuple of: (parsed_text, parser_type, parse_confidence)
    """
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    # 1. Handle code/text files directly
    text_extensions = {"py", "sql", "js", "ts", "txt", "java", "cpp", "c", "h", "cs", "html", "css", "json", "md", "csv"}
    if ext in text_extensions or (content_type and content_type.startswith("text/")):
        try:
            # Read directly as UTF-8 string with fallback to ignore bad chars
            text_content = file_bytes.decode("utf-8", errors="ignore")
            char_count = len(text_content.strip())
            logger.info(f"Loaded script/text file '{filename}' directly as string. Size: {char_count} chars.")
            # Confidence is high since it's a native source code/text file
            return text_content, "raw_text_loader", 1.0
        except Exception as e:
            logger.error(f"Failed to read source code file '{filename}' as string: {e}")
            return "", "raw_text_failed", 0.0

    # 2. Handle PDF files
    if ext == "pdf" or (content_type and "pdf" in content_type):
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            text_pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    text_pages.append(text)
            
            raw_text = "\n\n".join(text_pages).strip()
            char_count = len(raw_text)
            logger.info(f"PdfReader successfully extracted {char_count} characters from '{filename}'.")

            # Validate text density: if it yields less than 300 characters, it is likely a scan
            if char_count < 300:
                logger.warning(f"Extracted text from PDF '{filename}' is too sparse ({char_count} chars). Switching to OCR fallback...")
                ocr_text, parser, confidence = extract_ocr_from_pdf_bytes(file_bytes)
                if len(ocr_text.strip()) >= 300:
                    return ocr_text, parser, confidence
                return raw_text, "pypdf_sparse", 0.2
            
            return raw_text, "pypdf", 0.95
        except Exception as e:
            logger.error(f"PdfReader extraction failed for '{filename}': {e}")
            # Try OCR directly on PdfReader failure
            logger.info("Attempting direct OCR fallback for failed PDF parse...")
            return extract_ocr_from_pdf_bytes(file_bytes)

    # 3. Unsupported extensions
    logger.warning(f"Unsupported file format/extension '{ext}' for file '{filename}'. Skipping parsing content.")
    return "", f"unsupported_format_{ext}", 0.0


def estimate_tokens(text_content: str) -> int:
    """
    Estimates token count using tiktoken (cl100k_base) or basic word approximation.
    """
    if HAS_TIKTOKEN:
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text_content))
        except Exception:
            pass
    # Approximate 1 token = 4 characters as standard backup
    return len(text_content) // 4


def apply_token_guardrails(text_content: str, max_tokens: int = 4000) -> str:
    """
    Truncates or chunks document text if it exceeds the model context limits.
    """
    tokens = estimate_tokens(text_content)
    if tokens <= max_tokens:
        return text_content

    logger.warning(f"Extracted content exceeds token guardrail ({tokens} > {max_tokens} tokens). Truncating to safe limits.")
    # Calculate target char limit based on 4 chars per token approximation
    char_limit = max_tokens * 4
    return text_content[:char_limit] + "\n\n[...Content truncated by Token Guardrail context limits...]"


def claim_next_job(db) -> Dict[str, Any] | None:
    """
    Atomically locks and claims the next queued grading run from PostgreSQL.
    """
    claim_query = text("""
        UPDATE public.grading_runs
        SET 
          status = 'running',
          started_at = NOW()
        WHERE id = (
          SELECT id 
          FROM public.grading_runs 
          WHERE status = 'queued'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, submission_id, assignment_id;
    """)
    result = db.execute(claim_query).fetchone()
    if result:
        return {
            "id": str(result[0]),
            "submission_id": str(result[1]),
            "assignment_id": str(result[2])
        }
    return None


def reclaim_stale_jobs(db) -> int:
    """
    Finds running jobs that have been stuck for more than 10 minutes and resets them to queued.
    """
    reclaim_query = text("""
        UPDATE public.grading_runs
        SET 
          status = 'queued',
          started_at = NULL,
          error_message = 'Job reclaimed: Worker heartbeat timed out.'
        WHERE status = 'running' 
          AND started_at < NOW() - INTERVAL '10 minutes'
        RETURNING id;
    """)
    reclaimed = db.execute(reclaim_query).fetchall()
    if reclaimed:
        logger.info(f"Reclaimed {len(reclaimed)} stale/stuck running runs.")
        db.commit()
        return len(reclaimed)
    return 0


def process_grading_run(db, job: Dict[str, Any]) -> None:
    run_id = job["id"]
    submission_id = job["submission_id"]
    assignment_id = job["assignment_id"]
    
    logger.info(f"Processing Grading Run: {run_id} | Submission: {submission_id} | Assignment: {assignment_id}")
    
    try:
        # 1. Update submission status in database
        db.execute(
            text("UPDATE public.submissions SET status = 'grading_in_progress' WHERE id = :sub_id"),
            {"sub_id": submission_id}
        )
        db.commit()

        # 2. Fetch submission notes and files
        submission = db.execute(
            text("SELECT submitted_text, student_identifier FROM public.submissions WHERE id = :sub_id"),
            {"sub_id": submission_id}
        ).fetchone()

        if not submission:
            raise ValueError(f"Submission {submission_id} not found in database.")

        submitted_text = submission[0] or ""
        student_email = submission[1]

        # 3. Retrieve files associated with the submission
        files = db.execute(
            text("SELECT id, storage_path, original_filename, content_type FROM public.submission_files WHERE submission_id = :sub_id"),
            {"sub_id": submission_id}
        ).fetchall()

        # 4. Ingest and parse each file
        extracted_pieces = []
        overall_char_count = 0
        overall_parse_confidence = 1.0

        for f in files:
            file_id, storage_path, original_filename, content_type = f
            logger.info(f"Downloading file: {original_filename} from storage path: {storage_path}")

            if not supabase_client:
                raise RuntimeError("Cannot download private storage deliverables. Supabase credentials are not configured.")

            try:
                # Download private file
                file_bytes = supabase_client.storage.from_("student-submissions").download(storage_path)
            except Exception as download_err:
                logger.error(f"Download failed for '{original_filename}': {download_err}")
                raise RuntimeError(f"Failed to retrieve file '{original_filename}' from storage bucket: {download_err}")

            # Parse document contents
            parsed_text, parser_type, parse_confidence = parse_file_content(file_bytes, original_filename, content_type)
            overall_char_count += len(parsed_text)
            overall_parse_confidence = min(overall_parse_confidence, parse_confidence)

            # Insert extraction artifact log into database schema
            # Public database uses evidence_extractions or file_artifacts.
            # Let's save metadata logs to public.submission_files since the columns are there
            db.execute(
                text("""
                    UPDATE public.submission_files
                    SET 
                      processing_status = :status,
                      sha256 = COALESCE(sha256, 'processed')
                    WHERE id = :file_id
                """),
                {
                    "status": "completed" if len(parsed_text) > 0 or parser_type.startswith("raw") else "failed",
                    "file_id": file_id
                }
            )
            db.commit()

            if parsed_text.strip():
                extracted_pieces.append(
                    f"--- ATTACHED FILE CONTENT: {original_filename} ---\n{parsed_text}\n--- END OF FILE CONTENT ---"
                )

        # 5. Check Ingestion Quality Constraints
        has_files = len(files) > 0
        combined_file_text = "\n\n".join(extracted_pieces)
        
        # If files exist but we extracted basically zero text, raise ingestion failure
        if has_files and len(combined_file_text.strip()) < 300:
            raise ValueError(
                "Ingestion Failed: Attached deliverables are unreadable or yielded insufficient text "
                f"({len(combined_file_text.strip())} chars extracted). Requires manual verification."
            )

        # Apply Token Guardrails to the compiled file text
        secured_file_text = apply_token_guardrails(combined_file_text, max_tokens=6000)

        # 6. Fetch Rubric Criteria details
        criteria = db.execute(
            text("""
                SELECT id, name, description, max_points, weight, evaluation_hints
                FROM public.rubric_criteria
                WHERE rubric_id = (
                  SELECT rubric_id FROM public.assignments WHERE id = :assignment_id
                )
            """),
            {"assignment_id": assignment_id}
        ).fetchall()

        if not criteria:
            raise ValueError(f"Rubric criteria not found for assignment {assignment_id}.")

        # 7. Construct stateless RubriCore schema payload
        rubric_schema = {
            "schema_version": "1.0",
            "criteria": [
                {
                    "key": str(c[0]),
                    "label": c[1],
                    "description": c[2] or "",
                    "weight": str(c[4] or 1.0),
                    "max_points": c[3],
                    "evaluation_hints": c[5] if len(c) > 5 and isinstance(c[5], dict) else {}
                } for c in criteria
            ],
            "performance_levels": [
                {"key": "meets", "label": "Meets", "score": "1.0", "position": 0}
            ],
            "descriptors": []
        }


        # Combine student comments + extracted deliverables as LLM evidence
        compiled_evidence_text = (
            f"STUDENT NOTES / COMMENTARY:\n{submitted_text}\n\n"
            f"EXTRACTED DELIVERABLES:\n{secured_file_text}"
        )

        evidence_payload = [
            {
                "id": "compiled-evidence",
                "raw_text": compiled_evidence_text,
                "value_payload": {
                    "files": [f[1] for f in files]
                }
            }
        ]

        # 8. Query AI provider via Broker (Gemini if key is present, otherwise Ollama)
        request_payload = {
            "submission_id": submission_id,
            "rubric_version_id": "worker-rubric",
            "rubric_schema": rubric_schema,
            "evidence": evidence_payload,
            "deterministic": {},
            "output_schema_version": "phase-1-grading-output-v1",
        }

        from app.ai.broker import AIBroker
        model_choice = "gemini" if settings.gemini_api_key else "ollama"
        logger.info(f"Executing AI provider evaluation workflow ({model_choice})...")
        provider = AIBroker.get_provider(model_choice)
        result = provider.evaluate(request_payload)

        # 9. Save suggestions to public.rubric_score_suggestions
        suggestions = result.get("criterion_suggestions") or []
        for s in suggestions:
            criterion_key = s.get("criterion_key")
            suggested_score = float(s.get("score") or 0.0)
            suggested_feedback = s.get("explanation") or ""
            confidence = float(s.get("confidence") or 0.0)

            # Insert suggestion row
            db.execute(
                text("""
                    INSERT INTO public.rubric_score_suggestions (
                        grading_run_id, submission_id, rubric_criterion_id, 
                        suggested_score, suggested_feedback, confidence, status
                    ) VALUES (
                        :run_id, :sub_id, :crit_id, 
                        :score, :feedback, :confidence, 'suggested'
                    )
                """),
                {
                    "run_id": run_id,
                    "sub_id": submission_id,
                    "crit_id": criterion_key,
                    "score": suggested_score,
                    "feedback": suggested_feedback,
                    "confidence": confidence
                }
            )

        # Check if auto-publish is allowed
        assignment = db.execute(
            text("SELECT auto_publish_grades, max_score FROM public.assignments WHERE id = :asg_id"),
            {"asg_id": assignment_id}
        ).fetchone()
        
        auto_publish = assignment[0] if assignment else False
        max_score = assignment[1] if assignment else 100
        
        target_status = 'published' if auto_publish else 'draft'
        published_at_val = datetime_now_iso() if auto_publish else None
        overall_feedback_text = result.get("overall_feedback_draft") or "AI suggestion received."

        # Insert or update grading_results record
        existing_result = db.execute(
            text("SELECT id FROM public.grading_results WHERE submission_id = :sub_id"),
            {"sub_id": submission_id}
        ).fetchone()

        if existing_result:
            db.execute(
                text("""
                    UPDATE public.grading_results
                    SET 
                      overall_feedback = :feedback,
                      status = :status,
                      published_at = :published_at,
                      latest_grading_run_id = :run_id,
                      graded_at = NOW()
                    WHERE id = :result_id
                """),
                {
                    "feedback": overall_feedback_text,
                    "status": target_status,
                    "published_at": published_at_val,
                    "run_id": run_id,
                    "result_id": existing_result[0]
                }
            )
        else:
            db.execute(
                text("""
                    INSERT INTO public.grading_results (
                        submission_id, status, overall_feedback, latest_grading_run_id, published_at, graded_at
                    ) VALUES (
                        :sub_id, :status, :feedback, :run_id, :published_at, NOW()
                    )
                """),
                {
                    "sub_id": submission_id,
                    "status": target_status,
                    "feedback": overall_feedback_text,
                    "run_id": run_id,
                    "published_at": published_at_val
                }
            )

        # 10. Finalize statuses
        submission_status = 'graded' if auto_publish else 'grading_in_progress'
        db.execute(
            text("UPDATE public.submissions SET status = :status WHERE id = :sub_id"),
            {"status": submission_status, "sub_id": submission_id}
        )

        db.execute(
            text("""
                UPDATE public.grading_runs
                SET 
                  status = 'succeeded',
                  completed_at = NOW(),
                  response_payload = :response
                WHERE id = :run_id
            """),
            {"response": json_dumps_safe(result), "run_id": run_id}
        )
        db.commit()
        logger.info(f"Grading run completed successfully: {run_id}")

    except Exception as process_error:
        db.rollback()
        logger.error(f"Grading run execution failed: {process_error}")
        err_msg = str(process_error)

        try:
            # Revert submission status and mark grading run as failed
            db.execute(
                text("UPDATE public.submissions SET status = 'grading_in_progress' WHERE id = :sub_id"),
                {"sub_id": submission_id}
            )
            db.execute(
                text("""
                    UPDATE public.grading_runs
                    SET 
                      status = 'failed',
                      completed_at = NOW(),
                      error_message = :err
                    WHERE id = :run_id
                """),
                {"err": err_msg, "run_id": run_id}
            )
            db.commit()
        except Exception as db_err:
            db.rollback()
            logger.critical(f"Failed to record grading run failure in database: {db_err}")


def datetime_now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def json_dumps_safe(obj: Any) -> str:
    import json
    return json.dumps(obj, default=str)


def start_worker_daemon() -> None:
    logger.info("Starting RubriCore background grading worker loop...")
    
    poll_count = 0
    while True:
        try:
            with SessionLocal() as db:
                # Reclaim stale jobs every 15 loops (~30 seconds)
                if poll_count % 15 == 0:
                    reclaim_stale_jobs(db)

                # Query and lock next job
                job = claim_next_job(db)
                if job:
                    db.commit()  # commit the claim immediately to release row lock
                    process_grading_run(db, job)
                else:
                    # No jobs queued, sleep
                    db.rollback()  # Release connections

            poll_count += 1
            time.sleep(2)
        except KeyboardInterrupt:
            logger.info("Worker daemon stopped by user.")
            break
        except Exception as loop_err:
            logger.error(f"Worker loop encountered critical error: {loop_err}")
            time.sleep(5)


if __name__ == "__main__":
    start_worker_daemon()
