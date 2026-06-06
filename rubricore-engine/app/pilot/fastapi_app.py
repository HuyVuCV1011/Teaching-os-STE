from __future__ import annotations

from collections.abc import Generator
import json
import logging
from typing import Annotated, Any, cast
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.ollama import OllamaGradingProvider
from app.ai.broker import AIBroker, get_provider
from app.core.config import get_settings

logger = logging.getLogger("rubricore_worker")
from app.db.models import (
    GradingResult,
    Organization,
    ReviewTask,
    Rubric,
    RubricVersion,
    Submission,
    User,
    PromptConfiguration,
)
from app.db.services.grading_orchestration import GradingOrchestrationError
from app.db.services.review_policy import (
    ReviewDecisionResult,
    ReviewPolicyError,
    adjust_review_score,
    approve_review_result,
    edit_review_feedback,
    override_criterion_result,
    return_review_for_regrade,
)
from app.db.services.review_queue import review_task_summary
from app.db.services.subject_packs import subject_pack_summary
from app.db.session import get_db
from app.pilot.api_adapters import public_evaluation_baseline_adapter, validate_fixture_manifest_adapter
from app.pilot.auth_provider import AuthProvider, PilotAuthProviderError, PilotHeaderAuthProvider
from app.pilot.authz import PilotAuthContext, PilotAuthorizationError, PilotRole
from pydantic import BaseModel, Field
from app.pilot.contracts import (
    ApiErrorResponse,
    EvaluationBaselineRequest,
    EvaluationBaselineResponse,
    DemoGradingContextResponse,
    FixtureManifestRequest,
    FixtureManifestValidationResponse,
    GradingRunRequest,
    GradingRunResponse,
    ReviewActionRequest,
    ReviewActionResponse,
    SubjectPackSummaryResponse,
    StatelessGradingRequest,
    SolutionGenerationRequest,
    SolutionGenerationResponse,
    RubricGenerationRequest,
    RubricGenerationResponse,
    AssignmentGenerationRequest,
    AssignmentGenerationResponse,
    ParseFileQuestionsRequest,
    SuggestQuestionAnswerRequest,
    SuggestQuestionAnswerResponse,
    SuggestBatchQuestionAnswersRequest,
    SuggestBatchQuestionAnswersResponse,
    BatchAnswerItem,
    PromptConfigurationResponse,
    PromptConfigurationSaveRequest,
)
from app.pilot.db_loaders import (
    load_criterion_result_for_review_action_context,
    load_answer_key_version_for_grading_context,
    load_grading_result_for_review_action_context,
    load_review_task_for_action_context,
    load_rubric_version_for_grading_context,
    load_submission_for_review_action_context,
    load_subject_pack_for_context,
    load_submission_for_grading_context,
)
from app.pilot.workflows import export_grading_result_workflow, run_grading_workflow
from app.pilot.ui_html import PILOT_UI_HTML


def create_app() -> FastAPI:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    
    app = FastAPI(
        title="RubriCore Pilot API",
        version="0.1.0",
        description="Pilot API boundary for public-safe routes and the first auth-aware DB-backed route.",
    )
    app.add_exception_handler(HTTPException, cast(Any, _http_exception_handler))
    app.add_exception_handler(RequestValidationError, cast(Any, _request_validation_exception_handler))
    app.add_exception_handler(PilotAuthorizationError, cast(Any, _authorization_exception_handler))

    @app.get("/pilot/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "pilot_fastapi"}

    @app.get("/pilot/ui", response_class=HTMLResponse)
    def pilot_ui() -> HTMLResponse:
        return HTMLResponse(PILOT_UI_HTML)

    @app.get(
        "/pilot/demo/sample-grading-context",
        response_model=DemoGradingContextResponse,
    )
    def demo_sample_grading_context_route(
        db: Annotated[Session, Depends(get_fastapi_db)],
    ) -> DemoGradingContextResponse:
        settings = get_settings()
        if settings.is_production:
            raise _api_http_exception(404, code="not_found", message="Demo grading context is not available.")

        context = _load_demo_grading_context(db)
        if context is None:
            raise _api_http_exception(
                404,
                code="demo_context_missing",
                message="Run scripts/seed_dev.py before loading the demo grading context.",
            )
        return context

    @app.post(
        "/pilot/fixtures/manifest/validate",
        response_model=FixtureManifestValidationResponse,
    )
    def validate_fixture_manifest_route(
        request: FixtureManifestRequest,
    ) -> FixtureManifestValidationResponse:
        return validate_fixture_manifest_adapter(request.model_dump(mode="json"))

    @app.post(
        "/pilot/generate-solution",
        response_model=SolutionGenerationResponse,
    )
    def generate_solution_route(
        request: SolutionGenerationRequest,
    ) -> SolutionGenerationResponse:
        try:
            solution = AIBroker.generate_solution_key(
                model_choice=request.model_choice,
                assignment_text=request.assignment_text,
                knowledge_dossier=request.knowledge_dossier,
            )
            return SolutionGenerationResponse(solution_key=solution)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    @app.post(
        "/pilot/generate-rubric",
        response_model=RubricGenerationResponse,
    )
    def generate_rubric_route(
        request: RubricGenerationRequest,
    ) -> RubricGenerationResponse:
        try:
            rubric = AIBroker.generate_rubric(
                model_choice=request.model_choice,
                assignment_text=request.assignment_text,
                solution_text=request.solution_text,
                knowledge_dossier=request.knowledge_dossier,
            )
            criteria_list = rubric.get("criteria", [])
            return RubricGenerationResponse(criteria=criteria_list)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    class RAGRubricGenerationRequest(BaseModel):
        assignment_text: str
        solution_text: str
        model_choice: str = "gemini-2.5-flash"
        allowed_access_scopes: list[str] = ["organization", "public_safe"]

    @app.post(
        "/pilot/generate-rubric-rag",
        response_model=RubricGenerationResponse,
    )
    def generate_rubric_rag_route(
        request: RAGRubricGenerationRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ) -> RubricGenerationResponse:
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to generate RAG rubrics.")

        from app.db.services.knowledge_library import retrieve_candidate_chunks

        try:
            candidates = retrieve_candidate_chunks(
                db,
                organization_id=auth_context.organization_id,
                query=request.assignment_text,
                allowed_access_scopes=set(request.allowed_access_scopes),
                limit=5,
            )

            dossier_parts = []
            for idx, c in enumerate(candidates):
                source_title = c.citation.get("knowledge_source_title") or "Unknown Document"
                heading = " > ".join(c.chunk.heading_path) if c.chunk.heading_path else ""
                dossier_parts.append(
                    f"--- Source reference {idx + 1}: {source_title} ({heading}) ---\n"
                    f"{c.chunk.content}\n"
                )
            
            # Query custom prompt configuration
            prompt_config = db.scalar(
                select(PromptConfiguration).where(PromptConfiguration.key == "rag_rubric_template")
            )
            prompt_template = prompt_config.prompt_text if prompt_config else None

            rubric = AIBroker.generate_rubric(
                model_choice=request.model_choice,
                assignment_text=request.assignment_text,
                solution_text=request.solution_text,
                knowledge_dossier=knowledge_dossier,
                prompt_template=prompt_template,
            )
            criteria_list = rubric.get("criteria", [])
            return RubricGenerationResponse(criteria=criteria_list)
        except Exception as e:
            logger.error("Failed to generate rubric via RAG: %s", e)
            raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    @app.get(
        "/pilot/prompts/{key}",
        response_model=PromptConfigurationResponse,
    )
    def get_prompt_route(
        key: str,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ) -> PromptConfigurationResponse:
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to access prompt configurations.")

        prompt_config = db.scalar(
            select(PromptConfiguration).where(PromptConfiguration.key == key)
        )
        if prompt_config:
            return PromptConfigurationResponse(key=key, prompt_text=prompt_config.prompt_text)

        # Fallback to defaults if key is 'rag_rubric_template'
        if key == "rag_rubric_template":
            from app.ai.prompts import DEFAULT_RAG_RUBRIC_TEMPLATE
            return PromptConfigurationResponse(key=key, prompt_text=DEFAULT_RAG_RUBRIC_TEMPLATE)

        # For any other key that doesn't exist
        raise HTTPException(status_code=404, detail=f"Prompt template configuration with key '{key}' not found.")

    @app.post(
        "/pilot/prompts/{key}",
        response_model=PromptConfigurationResponse,
    )
    def save_prompt_route(
        key: str,
        request: PromptConfigurationSaveRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ) -> PromptConfigurationResponse:
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to modify prompt configurations.")

        try:
            prompt_config = db.scalar(
                select(PromptConfiguration).where(PromptConfiguration.key == key)
            )
            if prompt_config:
                prompt_config.prompt_text = request.prompt_text
            else:
                prompt_config = PromptConfiguration(
                    key=key,
                    prompt_text=request.prompt_text
                )
                db.add(prompt_config)
            
            db.commit()
            db.refresh(prompt_config)
            return PromptConfigurationResponse(key=key, prompt_text=prompt_config.prompt_text)
        except Exception as e:
            db.rollback()
            logger.error("Failed to save prompt configuration: %s", e)
            raise HTTPException(status_code=500, detail=f"Failed to save prompt configuration: {e}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    @app.post(
        "/pilot/generate-assignment",
        response_model=AssignmentGenerationResponse,
    )
    def generate_assignment_route(
        request: AssignmentGenerationRequest,
    ) -> AssignmentGenerationResponse:
        try:
            res = AIBroker.generate_assignment_questions(
                model_choice=request.model_choice,
                assignment_type=request.assignment_type,
                category=request.category,
                question_count=request.question_count,
                generate_sample_data=request.generate_sample_data,
                lesson_content=request.lesson_content,
                knowledge_dossier=request.knowledge_dossier,
            )
            questions_list = res.get("questions", [])
            return AssignmentGenerationResponse(questions=questions_list)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    @app.post(
        "/pilot/parse-file-questions",
        response_model=AssignmentGenerationResponse,
    )
    def parse_file_questions_route(
        request: ParseFileQuestionsRequest,
    ) -> AssignmentGenerationResponse:
        try:
            res = AIBroker.parse_file_questions(
                model_choice=request.model_choice,
                file_content=request.file_content,
            )
            questions_list = res.get("questions", [])
            return AssignmentGenerationResponse(questions=questions_list)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI file parsing failed: {e}")

    @app.post(
        "/pilot/suggest-question-answer",
        response_model=SuggestQuestionAnswerResponse,
    )
    def suggest_question_answer_route(
        request: SuggestQuestionAnswerRequest,
    ) -> SuggestQuestionAnswerResponse:
        try:
            # Construct a clear, context-aware prompt for single question suggest
            prompt = f"Question: {request.question_content}\n\n"
            if request.materials_text:
                prompt += f"Source Materials Context:\n{request.materials_text}\n\n"
            if request.lesson_context:
                prompt += f"Lesson Topic/Overview Context:\n{request.lesson_context}\n\n"
            prompt += "Please suggest a precise, accurate, and comprehensive correct answer or expected solution for the question above. Output ONLY the answer, with no introductory or trailing text."

            provider = get_provider(request.model_choice)
            ans = provider.generate("You are an expert teaching assistant helping write clear and correct sample answers for a lesson assignment.", prompt)
            return SuggestQuestionAnswerResponse(answer=ans.strip())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI answer suggest failed: {e}")

    @app.post(
        "/pilot/suggest-batch-question-answers",
        response_model=SuggestBatchQuestionAnswersResponse,
    )
    def suggest_batch_question_answers_route(
        request: SuggestBatchQuestionAnswersRequest,
    ) -> SuggestBatchQuestionAnswersResponse:
        try:
            questions_payload = [q.model_dump() for q in request.questions]
            res = AIBroker.suggest_batch_question_answers(
                model_choice=request.model_choice,
                questions=questions_payload,
                materials_text=request.materials_text,
                lesson_context=request.lesson_context,
            )
            answers_list = res.get("answers", [])
            batch_answers = [
                BatchAnswerItem(id=ans.get("id"), answer=ans.get("answer", ""))
                for ans in answers_list
            ]
            return SuggestBatchQuestionAnswersResponse(answers=batch_answers)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI batch answer suggest failed: {e}")

    @app.post(
        "/pilot/evaluation/public-baseline",
        response_model=EvaluationBaselineResponse,
    )
    def public_evaluation_baseline_route(
        request: EvaluationBaselineRequest,
    ) -> EvaluationBaselineResponse:
        return public_evaluation_baseline_adapter(request.model_dump(mode="json"))

    @app.get(
        "/pilot/subject-packs/{key}",
        response_model=SubjectPackSummaryResponse,
    )
    def get_subject_pack_route(
        key: str,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ) -> SubjectPackSummaryResponse:
        pack = load_subject_pack_for_context(db, key=key, context=auth_context)
        if pack is None:
            raise _api_http_exception(404, code="not_found", message="Subject pack was not found.")
        return SubjectPackSummaryResponse.model_validate(subject_pack_summary(pack))

    @app.post(
        "/pilot/grading-runs",
        response_model=GradingRunResponse,
    )
    def run_grading_route(
        request: GradingRunRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
        ai_provider: Annotated[Any, Depends(get_ai_grading_provider)],
    ) -> GradingRunResponse:
        submission = load_submission_for_grading_context(db, submission_id=request.submission_id, context=auth_context)
        if submission is None:
            raise _api_http_exception(404, code="not_found", message="Submission was not found.")
        rubric_version = load_rubric_version_for_grading_context(
            db,
            rubric_version_id=request.rubric_version_id,
            context=auth_context,
        )
        if request.rubric_version_id is not None and rubric_version is None:
            raise _api_http_exception(404, code="not_found", message="Rubric version was not found.")
        answer_key_version = load_answer_key_version_for_grading_context(
            db,
            answer_key_version_id=request.answer_key_version_id,
            context=auth_context,
        )
        if request.answer_key_version_id is not None and answer_key_version is None:
            raise _api_http_exception(404, code="not_found", message="Answer key version was not found.")

        try:
            response = run_grading_workflow(
                db,
                submission=submission,
                rubric_version=rubric_version,
                answer_key_version=answer_key_version,
                ai_provider=ai_provider,
                request=request,
                actor_user_id=auth_context.actor_user_id,
            )
            _commit_if_supported(db)
            return response
        except GradingOrchestrationError as exc:
            _rollback_if_supported(db)
            raise _api_http_exception(400, code="grading_error", message=str(exc)) from exc

    @app.post(
        "/pilot/review-tasks/{review_task_id}/actions/{action}",
        response_model=ReviewActionResponse,
    )
    def teacher_review_action_route(
        review_task_id: UUID,
        action: str,
        request: ReviewActionRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ) -> ReviewActionResponse:
        review_task = load_review_task_for_action_context(db, review_task_id=review_task_id, context=auth_context)
        if review_task is None:
            raise _api_http_exception(404, code="not_found", message="Review task was not found.")
        if review_task.grading_result_id is None:
            raise _api_http_exception(
                400,
                code="review_context_missing",
                message="Review task is not linked to a grading result.",
            )
        grading_result = load_grading_result_for_review_action_context(
            db,
            grading_result_id=review_task.grading_result_id,
            context=auth_context,
        )
        if grading_result is None:
            raise _api_http_exception(404, code="not_found", message="Grading result was not found.")
        submission = load_submission_for_review_action_context(
            db,
            submission_id=review_task.submission_id,
            context=auth_context,
        )
        if submission is None:
            raise _api_http_exception(404, code="not_found", message="Submission was not found.")

        try:
            outcome = _apply_review_action(
                db,
                action=action,
                request=request,
                review_task=review_task,
                grading_result=grading_result,
                submission=submission,
                auth_context=auth_context,
                reviewer_id=auth_context.actor_user_id,
                request_id=request.request_id or auth_context.request_id,
            )
            _commit_if_supported(db)
            return _review_action_response(outcome)
        except ReviewPolicyError as exc:
            _rollback_if_supported(db)
            raise _api_http_exception(400, code="review_policy_error", message=str(exc)) from exc

    @app.post(
        "/pilot/grade-submission",
    )
    def grade_submission_route(
        request: StatelessGradingRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        ai_provider: Annotated[Any, Depends(get_ai_grading_provider)],
    ) -> dict[str, Any]:
        if not request.ai_allowed:
            raise _api_http_exception(400, code="ai_not_allowed", message="AI grading is disabled.")
        request_payload = {
            "submission_id": "stateless-submission",
            "rubric_version_id": "stateless-rubric",
            "rubric_schema": request.rubric_schema,
            "evidence": request.evidence,
            "deterministic": {},
            "output_schema_version": "phase-1-grading-output-v1",
        }
        try:
            raw_output = ai_provider.evaluate(request_payload)
            return raw_output
        except Exception as exc:
            raise _api_http_exception(400, code="grading_error", message=str(exc))

    class KnowledgeSearchRequest(BaseModel):
        query: str
        limit: int = 10
        allowed_access_scopes: list[str] = ["organization"]
        source_ids: list[UUID] | None = None

    @app.post(
        "/pilot/knowledge/upload",
    )
    async def upload_knowledge_route(
        title: str = Form(...),
        access_scope: str = Form("organization"),
        file: UploadFile = File(...),
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)] = None,
        db: Annotated[Session, Depends(get_fastapi_db)] = None,
    ):
        if not auth_context:
            raise HTTPException(status_code=401, detail="Authentication context missing.")

        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to upload knowledge.")

        try:
            content_bytes = await file.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

        import uuid
        from app.db.services.knowledge_library import (
            register_knowledge_source,
            convert_knowledge_source_to_markdown,
            create_knowledge_chunks,
            _source_format_from_filename,
            convert_plain_text_to_markdown,
        )

        try:
            # Check if file size > 5MB for async ingestion
            if len(content_bytes) > 5 * 1024 * 1024:
                from supabase import create_client
                from app.db.models.file_artifact import FileArtifact
                settings = get_settings()
                if not settings.supabase_url or not settings.supabase_service_role_key:
                    raise HTTPException(status_code=500, detail="Supabase credentials are not configured.")
                supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
                source = register_knowledge_source(
                    db,
                    organization_id=auth_context.organization_id,
                    title=title,
                    source_filename=file.filename,
                    source_storage_uri="pending_upload",
                    owner_user_id=auth_context.actor_user_id,
                    access_scope=access_scope,
                    source_type="knowledge_library",
                )
                db.flush()
                storage_path = f"knowledge/{source.id}/{file.filename}"
                supabase_client.storage.from_("student-submissions").upload(
                    path=storage_path,
                    file=content_bytes,
                    file_options={"content-type": file.content_type or "application/octet-stream"}
                )
                file_art = db.get(FileArtifact, source.source_file_artifact_id)
                if file_art:
                    file_art.storage_uri = storage_path
                    file_art.file_size_bytes = len(content_bytes)
                db.commit()
                return {
                    "status": "processing",
                    "knowledge_source_id": str(source.id),
                    "chunks_count": 0
                }

            storage_uri = f"upload://knowledge/{uuid.uuid4()}/{file.filename}"
            source = register_knowledge_source(
                db,
                organization_id=auth_context.organization_id,
                title=title,
                source_filename=file.filename,
                source_storage_uri=storage_uri,
                owner_user_id=auth_context.actor_user_id,
                access_scope=access_scope,
                source_type="knowledge_library",
            )
            source.status = "active"
            db.flush()

            converted_artifact = convert_knowledge_source_to_markdown(
                db,
                knowledge_source=source,
                source_filename=file.filename,
                source_content=content_bytes,
            )
            if converted_artifact:
                source.converted_markdown_artifact_id = converted_artifact.id
                db.flush()

            source_format = _source_format_from_filename(file.filename)
            if source_format == "markdown":
                markdown_content = content_bytes.decode("utf-8", errors="ignore")
            elif source_format == "text":
                text_str = content_bytes.decode("utf-8", errors="ignore")
                markdown_content = convert_plain_text_to_markdown(text_str, title=source.title)
            elif source_format == "pdf":
                from app.core.parsers import parse_pdf_to_markdown
                markdown_content = parse_pdf_to_markdown(content_bytes, title=source.title)
            elif source_format == "docx":
                from app.core.parsers import parse_docx_to_markdown
                markdown_content = parse_docx_to_markdown(content_bytes, title=source.title)
            elif source_format == "xlsx":
                from app.core.parsers import parse_xlsx_to_markdown
                markdown_content = parse_xlsx_to_markdown(content_bytes, title=source.title)
            elif source_format == "csv":
                from app.core.parsers import parse_csv_to_markdown
                markdown_content = parse_csv_to_markdown(content_bytes, title=source.title)
            else:
                markdown_content = ""

            chunks = []
            if markdown_content:
                chunks = create_knowledge_chunks(
                    db,
                    knowledge_source=source,
                    markdown_content=markdown_content,
                )
            db.commit()
            
            return {
                "status": "success",
                "knowledge_source_id": str(source.id),
                "chunks_count": len(chunks)
            }
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to ingest knowledge: {e}")

    @app.get(
        "/pilot/knowledge/sources",
    )
    def list_knowledge_sources_route(
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ):
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to list knowledge sources.")

        statement = (
            select(KnowledgeSource)
            .where(
                KnowledgeSource.organization_id == auth_context.organization_id,
                KnowledgeSource.status.in_(["active", "draft"])
            )
            .order_by(KnowledgeSource.created_at.desc())
        )
        sources = list(db.scalars(statement))
        
        result = []
        for s in sources:
            chunks_count = db.scalar(
                select(text("COUNT(*)")).select_from(text("public.knowledge_chunks")).where(
                    text("knowledge_source_id = :sid"),
                    text("status = 'active'")
                ),
                {"sid": s.id}
            ) or 0
            
            original_filename = "Unknown"
            if s.source_file_artifact_id:
                file_art = db.execute(
                    select(text("original_filename")).select_from(text("public.file_artifacts")).where(
                        text("id = :aid")
                    ),
                    {"aid": s.source_file_artifact_id}
                ).fetchone()
                if file_art:
                    original_filename = file_art[0]

            result.append({
                "id": str(s.id),
                "title": s.title,
                "version_number": s.version_number,
                "access_scope": s.access_scope,
                "conversion_status": s.conversion_status,
                "status": s.status,
                "summary": s.summary,
                "original_filename": original_filename,
                "chunks_count": chunks_count,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            })
        return {"status": "success", "sources": result}

    @app.post(
        "/pilot/knowledge/query",
    )
    def query_knowledge_chunks_route(
        request: KnowledgeSearchRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ):
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to query knowledge library.")

        from app.db.services.knowledge_library import retrieve_candidate_chunks
        
        source_ids_set = set(request.source_ids) if request.source_ids else None
        
        candidates = retrieve_candidate_chunks(
            db,
            organization_id=auth_context.organization_id,
            query=request.query,
            allowed_access_scopes=set(request.allowed_access_scopes),
            source_ids=source_ids_set,
            limit=request.limit,
        )
        
        results = []
        for c in candidates:
            results.append({
                "chunk_id": str(c.chunk.id),
                "knowledge_source_id": str(c.chunk.knowledge_source_id),
                "heading_path": list(c.chunk.heading_path),
                "content": c.chunk.content,
                "score": float(c.score),
                "matched_terms": list(c.matched_terms),
                "citation": c.citation,
            })
            
        return {"status": "success", "results": results}

    @app.delete(
        "/pilot/knowledge/sources/{source_id}",
    )
    def delete_knowledge_source_route(
        source_id: UUID,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ):
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to delete knowledge sources.")

        source = db.get(KnowledgeSource, source_id)
        if not source or source.organization_id != auth_context.organization_id:
            raise HTTPException(status_code=404, detail="Knowledge source not found.")
            
        source.status = "archived"
        
        db.execute(
            text("UPDATE public.knowledge_chunks SET status = 'archived' WHERE knowledge_source_id = :sid AND status = 'active'"),
            {"sid": source_id}
        )
        
        db.commit()
        return {"status": "success", "message": f"Source {source_id} deleted successfully."}

    @app.post(
        "/pilot/knowledge/search",
    )
    def search_knowledge_route(
        request: KnowledgeSearchRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
        db: Annotated[Session, Depends(get_fastapi_db)],
    ):
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to search knowledge.")

        from sqlalchemy import select, text
        from app.core.config import get_settings
        from app.ai.gemini import GeminiProvider
        from app.db.models.knowledge import RefinedKnowledgeEntry, KnowledgeTopic

        settings = get_settings()
        results = []
        
        if settings.gemini_api_key and request.query.strip():
            try:
                provider = GeminiProvider(api_key=settings.gemini_api_key)
                query_vector = provider.embed(request.query)
                query_vector_str = f"[{','.join(map(str, query_vector))}]"
                
                # Perform cosine similarity search on refined_knowledge_entries
                statement = (
                    select(RefinedKnowledgeEntry)
                    .where(
                        RefinedKnowledgeEntry.organization_id == auth_context.organization_id,
                        RefinedKnowledgeEntry.status == "active"
                    )
                    .order_by(text(f"embedding <=> '{query_vector_str}'"))
                    .limit(request.limit)
                )
                entries = list(db.scalars(statement))
                
                for idx, entry in enumerate(entries):
                    topic_name = "General"
                    if entry.topic_id:
                        topic = db.get(KnowledgeTopic, entry.topic_id)
                        if topic:
                            topic_name = topic.name
                            
                    results.append({
                        "chunk_id": str(entry.id),
                        "knowledge_source_id": str(entry.topic_id or ""),
                        "heading_path": [topic_name],
                        "content": f"## {entry.title}\n*{entry.summary}*\n\n{entry.content}",
                        "score": float(idx + 1),
                        "matched_terms": [],
                        "citation": {"knowledge_source_title": f"Topic: {topic_name}"},
                    })
            except Exception as e:
                logger.error("Failed vector search on refined entries: %s", e)
                # Fallback to keyword search
                terms = request.query.lower().split()
                statement = (
                    select(RefinedKnowledgeEntry)
                    .where(
                        RefinedKnowledgeEntry.organization_id == auth_context.organization_id,
                        RefinedKnowledgeEntry.status == "active"
                    )
                )
                all_entries = list(db.scalars(statement))
                kw_results = []
                for entry in all_entries:
                    content_lower = (entry.title + " " + (entry.summary or "") + " " + entry.content).lower()
                    matched = [t for t in terms if t in content_lower]
                    if matched:
                        kw_results.append((len(matched), entry))
                kw_results.sort(key=lambda x: x[0], reverse=True)
                for score, entry in kw_results[:request.limit]:
                    topic_name = "General"
                    if entry.topic_id:
                        topic = db.get(KnowledgeTopic, entry.topic_id)
                        if topic:
                            topic_name = topic.name
                    results.append({
                        "chunk_id": str(entry.id),
                        "knowledge_source_id": str(entry.topic_id or ""),
                        "heading_path": [topic_name],
                        "content": f"## {entry.title}\n*{entry.summary}*\n\n{entry.content}",
                        "score": float(score),
                        "matched_terms": [],
                        "citation": {"knowledge_source_title": f"Topic: {topic_name}"},
                    })
        
        return {"status": "success", "results": results}


    class EmbedRequest(BaseModel):
        contents: list[str]

    @app.post(
        "/pilot/knowledge/embed",
    )
    async def embed_route(
        request: EmbedRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
    ):
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to generate embeddings.")

        from app.core.config import get_settings
        from app.ai.gemini import GeminiProvider

        settings = get_settings()
        if not settings.gemini_api_key:
            raise HTTPException(status_code=500, detail="Gemini API Key not configured.")

        try:
            provider = GeminiProvider(api_key=settings.gemini_api_key)
            embeddings = provider.embed_batch(request.contents)
            return {"status": "success", "embeddings": embeddings}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {e}")


    class RefinedKnowledgeSourceRequest(BaseModel):
        id: UUID
        type: str
        title: str
        content: str

    class RefineKnowledgeRequest(BaseModel):
        subject_id: UUID | None = None
        sources: list[RefinedKnowledgeSourceRequest]
        existing_concepts: list[dict[str, Any]]
        model_choice: str = "gemini-2.5-flash"

    @app.post(
        "/pilot/knowledge/refine",
    )
    async def refine_knowledge_route(
        request: RefineKnowledgeRequest,
        auth_context: Annotated[PilotAuthContext, Depends(get_pilot_auth_context)],
    ):
        allowed_roles = {PilotRole.ADMIN, PilotRole.TEACHER, PilotRole.SYSTEM}
        if not any(r in allowed_roles for r in auth_context.roles):
            raise HTTPException(status_code=403, detail="Unauthorized to refine knowledge.")

        from app.ai.broker import generate_refined_knowledge
        from app.core.config import get_settings
        from app.ai.gemini import GeminiProvider

        try:
            sources_payload = [s.model_dump(mode="json") for s in request.sources]
            refined_data = generate_refined_knowledge(
                model_choice=request.model_choice,
                sources=sources_payload,
                existing_concepts=request.existing_concepts,
            )

            # Generate embeddings for each concept's content in batch using text-embedding-004
            settings = get_settings()
            if settings.gemini_api_key and refined_data.get("entries"):
                provider = GeminiProvider(api_key=settings.gemini_api_key)
                contents = []
                for entry in refined_data["entries"]:
                    # Create a search context combining title, summary, and content
                    concept_text = f"Title: {entry.get('title', '')}\nSummary: {entry.get('summary', '')}\nContent:\n{entry.get('content', '')}"
                    contents.append(concept_text)
                
                try:
                    embeddings = provider.embed_batch(contents)
                    for entry, emb in zip(refined_data["entries"], embeddings):
                        entry["embedding"] = emb
                except Exception as emb_err:
                    logger.warning("Failed to generate batch embeddings for refined concepts: %s", emb_err)
            
            return {
                "status": "success",
                "entries": refined_data.get("entries", [])
            }
        except Exception as e:
            logger.error("Failed to refine knowledge in FastAPI: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    return app


def get_pilot_auth_provider() -> AuthProvider:
    return PilotHeaderAuthProvider()


def get_pilot_auth_context(
    request: Request,
    auth_provider: Annotated[AuthProvider, Depends(get_pilot_auth_provider)],
) -> PilotAuthContext:
    try:
        return auth_provider.verify_request(request.headers)
    except PilotAuthProviderError as exc:
        raise _api_http_exception(401, code=exc.code, message=exc.message) from exc


def get_fastapi_db() -> Generator[Session, None, None]:
    yield from get_db()


def get_ollama_grading_provider() -> OllamaGradingProvider:
    return OllamaGradingProvider.from_settings(get_settings())


def get_ai_grading_provider() -> Any:
    """Auto-detect: Gemini if API key present, else Ollama."""
    settings = get_settings()
    model_choice = "gemini" if settings.gemini_api_key else "ollama"
    provider = AIBroker.get_provider(model_choice)
    return provider


async def _http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(code="http_error", message=str(detail)),
    )


async def _request_validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_error_body(
            code="validation_error",
            message="Request failed validation.",
            details=_json_safe_errors(exc.errors()),
        ),
    )


async def _authorization_exception_handler(_: Request, exc: PilotAuthorizationError) -> JSONResponse:
    return JSONResponse(status_code=403, content=_error_body(code="forbidden", message=str(exc)))


def _api_http_exception(status_code: int, *, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=_error_body(code=code, message=message))


def _error_body(
    *,
    code: str,
    message: str,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {"error": ApiErrorResponse(code=code, message=message, details=details).model_dump(mode="json")}


def _json_safe_errors(errors: Any) -> list[dict[str, Any]]:
    return json.loads(json.dumps(errors, default=str))


def _commit_if_supported(db: Any) -> None:
    commit = getattr(db, "commit", None)
    if callable(commit):
        commit()


def _rollback_if_supported(db: Any) -> None:
    rollback = getattr(db, "rollback", None)
    if callable(rollback):
        rollback()


def _apply_review_action(
    db: Session,
    *,
    action: str,
    request: ReviewActionRequest,
    review_task: ReviewTask,
    grading_result: GradingResult,
    submission: Submission,
    auth_context: PilotAuthContext,
    reviewer_id: UUID,
    request_id: str | None,
) -> ReviewDecisionResult:
    normalized_action = action.strip().replace("_", "-")
    if normalized_action == "approve":
        return approve_review_result(
            cast(Any, db),
            review_task=review_task,
            grading_result=grading_result,
            submission=submission,
            reviewer_id=reviewer_id,
            reason=request.reason,
            request_id=request_id,
        )
    if normalized_action == "edit-feedback":
        if request.feedback is None:
            raise ReviewPolicyError("Edited feedback is required.")
        return edit_review_feedback(
            cast(Any, db),
            review_task=review_task,
            grading_result=grading_result,
            submission=submission,
            reviewer_id=reviewer_id,
            feedback=request.feedback,
            reason=request.reason,
            request_id=request_id,
        )
    if normalized_action == "adjust-score":
        if request.total_score is None:
            raise ReviewPolicyError("Adjusted total score is required.")
        return adjust_review_score(
            cast(Any, db),
            review_task=review_task,
            grading_result=grading_result,
            submission=submission,
            reviewer_id=reviewer_id,
            final_score=request.total_score,
            reason=request.reason,
            request_id=request_id,
        )
    if normalized_action == "adjust-criterion-score":
        if request.criterion_score is None:
            raise ReviewPolicyError("Adjusted criterion score is required.")
        if request.criterion_key is None or not request.criterion_key.strip():
            raise ReviewPolicyError("Criterion key is required.")
        if request.criterion_explanation is None or not request.criterion_explanation.strip():
            raise ReviewPolicyError("Criterion explanation is required.")
        previous_criterion_result = load_criterion_result_for_review_action_context(
            db,
            criterion_result_id=request.criterion_result_id,
            context=auth_context,
        )
        if request.criterion_result_id is not None and previous_criterion_result is None:
            raise ReviewPolicyError("Criterion result was not found.")
        return override_criterion_result(
            cast(Any, db),
            review_task=review_task,
            grading_result=grading_result,
            submission=submission,
            reviewer_id=reviewer_id,
            criterion_key=request.criterion_key,
            score=request.criterion_score,
            max_score=request.criterion_max_score,
            explanation=request.criterion_explanation,
            reason=request.reason,
            previous_criterion_result=previous_criterion_result,
            metadata_payload={"api_route": "/pilot/review-tasks/{review_task_id}/actions/adjust-criterion-score"},
            request_id=request_id,
        )
    if normalized_action == "return-for-regrade":
        return return_review_for_regrade(
            cast(Any, db),
            review_task=review_task,
            grading_result=grading_result,
            submission=submission,
            reviewer_id=reviewer_id,
            reason=request.reason,
            request_id=request_id,
            context_payload={"api_route": "/pilot/review-tasks/{review_task_id}/actions/return-for-regrade"},
        )
    raise ReviewPolicyError(f"Unknown review action: {action}.")


def _review_action_response(outcome: ReviewDecisionResult) -> ReviewActionResponse:
    return ReviewActionResponse.model_validate(
        {
            "review_task": review_task_summary(outcome.review_task),
            "grading_result": export_grading_result_workflow(outcome.grading_result).model_dump(mode="json"),
            "teacher_review_id": (
                str(outcome.teacher_review.id) if outcome.teacher_review.id is not None else None
            ),
            "decision": outcome.teacher_review.decision,
            "teacher_override_id": (
                str(outcome.teacher_override.id)
                if outcome.teacher_override is not None and outcome.teacher_override.id is not None
                else None
            ),
            "regrade_run_id": (
                str(outcome.regrade_run.id) if outcome.regrade_run is not None and outcome.regrade_run.id else None
            ),
            "actionable": outcome.review_task.status in {"open", "assigned"}
            and outcome.grading_result.status == "needs_review",
        }
    )


def _load_demo_grading_context(db: Session) -> DemoGradingContextResponse | None:
    organization = db.scalar(select(Organization).where(Organization.slug == "local-development"))
    if organization is None:
        return None

    user = db.scalar(
        select(User).where(
            User.organization_id == organization.id,
            User.email == "admin@example.local",
        )
    )
    if user is None:
        return None

    rubric = db.scalar(
        select(Rubric).where(
            Rubric.organization_id == organization.id,
            Rubric.slug == "python-score-summary-demo",
        )
    )
    if rubric is None:
        return None

    rubric_version = db.scalar(
        select(RubricVersion)
        .where(
            RubricVersion.organization_id == organization.id,
            RubricVersion.rubric_id == rubric.id,
            RubricVersion.status == "published",
        )
        .order_by(RubricVersion.version_number.desc())
    )
    if rubric_version is None:
        return None

    submission = db.scalar(
        select(Submission)
        .where(
            Submission.organization_id == organization.id,
            Submission.status == "submitted",
            Submission.metadata_payload["demo"].as_boolean().is_(True),
        )
        .order_by(Submission.created_at.desc())
    )
    if submission is None:
        return None

    return DemoGradingContextResponse(
        actor_user_id=str(user.id),
        organization_id=str(organization.id),
        role="teacher",
        submission_id=str(submission.id),
        rubric_version_id=str(rubric_version.id),
    )


app = create_app()

