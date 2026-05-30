from __future__ import annotations

from collections.abc import Generator
import json
import logging
from typing import Annotated, Any, cast
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Request
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
from app.pilot.authz import PilotAuthContext, PilotAuthorizationError
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
            )
            criteria_list = rubric.get("criteria", [])
            return RubricGenerationResponse(criteria=criteria_list)
        except Exception as e:
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


