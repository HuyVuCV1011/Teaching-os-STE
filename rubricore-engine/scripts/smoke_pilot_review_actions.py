from __future__ import annotations

import json
from pathlib import Path
import sys
from decimal import Decimal
from typing import Any

from fastapi.testclient import TestClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.pilot.fastapi_app import create_app  # noqa: E402


def main() -> None:
    summary = run_pilot_review_action_smoke()
    print(json.dumps(summary, indent=2, sort_keys=True))


def run_pilot_review_action_smoke() -> dict[str, Any]:
    client = TestClient(create_app())

    health = client.get("/pilot/health")
    _require_status(health.status_code, 200, "health", _response_json(health))

    sample = client.get("/pilot/demo/sample-grading-context")
    sample_body = _response_json(sample)
    _require_status(sample.status_code, 200, "sample grading context", sample_body)

    action_summaries = []
    for action_name in (
        "approve",
        "edit-feedback",
        "adjust-score",
        "adjust-criterion-score",
        "return-for-regrade",
    ):
        grading_body = _create_needs_review_grading_run(client, sample_body, action_name=action_name)
        action_body = _submit_review_action(client, sample_body, grading_body, action_name=action_name)
        _assert_action_result(action_name=action_name, action_body=action_body)
        action_summaries.append(
            _action_summary(action_name=action_name, grading_body=grading_body, action_body=action_body)
        )

    return {
        "health": health.json(),
        "sample": {
            "organization_id": sample_body["organization_id"],
            "submission_id": sample_body["submission_id"],
            "rubric_version_id": sample_body["rubric_version_id"],
        },
        "review_actions": action_summaries,
    }


def _create_needs_review_grading_run(
    client: TestClient,
    sample_body: dict[str, Any],
    *,
    action_name: str,
) -> dict[str, Any]:
    request_id = f"smoke-pilot-review-actions-grading-{action_name}"
    headers = _pilot_headers(sample_body, request_id=request_id)
    grading = client.post(
        "/pilot/grading-runs",
        headers=headers,
        json={
            "submission_id": sample_body["submission_id"],
            "rubric_version_id": sample_body["rubric_version_id"],
            "answer_key_version_id": sample_body.get("answer_key_version_id"),
            "ai_allowed": True,
            "auto_finalize_allowed": True,
            "mandatory_review": True,
            "request_id": request_id,
        },
    )
    grading_body = _response_json(grading)
    _require_status(grading.status_code, 200, f"{action_name} grading run", grading_body)

    review_task_id = grading_body.get("review_task_id")
    result = grading_body.get("grading_result") or {}
    if not review_task_id or result.get("status") != "needs_review":
        raise SystemExit(f"Grading did not produce an actionable review task: {grading_body}")
    return grading_body


def _submit_review_action(
    client: TestClient,
    sample_body: dict[str, Any],
    grading_body: dict[str, Any],
    *,
    action_name: str,
) -> dict[str, Any]:
    review_task_id = grading_body["review_task_id"]
    request_id = f"smoke-pilot-review-actions-{action_name}"
    action = client.post(
        f"/pilot/review-tasks/{review_task_id}/actions/{action_name}",
        headers=_pilot_headers(sample_body, request_id=request_id),
        json=_action_payload(action_name=action_name, grading_body=grading_body, request_id=request_id),
    )
    action_body = _response_json(action)
    _require_status(action.status_code, 200, f"{action_name} review action", action_body)
    return action_body


def _action_payload(*, action_name: str, grading_body: dict[str, Any], request_id: str) -> dict[str, Any]:
    result = grading_body.get("grading_result") or {}
    payload: dict[str, Any] = {
        "reason": f"Smoke test exercises {action_name}.",
        "request_id": request_id,
    }
    if action_name == "edit-feedback":
        payload["feedback"] = "Smoke test edited teacher feedback."
    elif action_name == "adjust-score":
        payload["total_score"] = _score_below_max(result.get("max_score"))
    elif action_name == "adjust-criterion-score":
        criterion = _first_criterion_result(result)
        payload.update(
            {
                "criterion_result_id": criterion.get("id"),
                "criterion_key": criterion["criterion_key"],
                "criterion_score": _score_below_max(criterion.get("max_score")),
                "criterion_max_score": criterion.get("max_score"),
                "criterion_explanation": "Smoke test adjusted this criterion score after teacher review.",
            }
        )
    return payload


def _assert_action_result(*, action_name: str, action_body: dict[str, Any]) -> None:
    action_task = action_body.get("review_task") or {}
    if action_task.get("status") != "completed":
        raise SystemExit(f"Review task was not completed: {action_body}")

    if action_name == "approve":
        _require_action_state(
            action_body,
            decision="approve",
            result_status="finalized",
            result_type="reviewed",
        )
    elif action_name in {"edit-feedback", "adjust-score", "adjust-criterion-score"}:
        _require_action_state(
            action_body,
            decision="override" if action_name != "adjust-score" else "adjust",
            result_status="finalized",
            result_type="overridden",
        )
        if not action_body.get("teacher_override_id"):
            raise SystemExit(f"{action_name} did not return a teacher override id: {action_body}")
    elif action_name == "return-for-regrade":
        _require_action_state(
            action_body,
            decision="return_for_regrade",
            result_status="needs_review",
            result_type="proposed",
        )
        if not action_body.get("regrade_run_id"):
            raise SystemExit(f"Return for regrade did not return a regrade run id: {action_body}")
    else:
        raise SystemExit(f"Unexpected smoke action: {action_name}")


def _require_action_state(
    action_body: dict[str, Any],
    *,
    decision: str,
    result_status: str,
    result_type: str,
) -> None:
    action_result = action_body.get("grading_result") or {}
    if action_body.get("decision") != decision:
        raise SystemExit(f"Review action returned an unexpected decision: {action_body}")
    if action_result.get("status") != result_status or action_result.get("result_type") != result_type:
        raise SystemExit(f"Grading result returned an unexpected state: {action_body}")


def _action_summary(
    *,
    action_name: str,
    grading_body: dict[str, Any],
    action_body: dict[str, Any],
) -> dict[str, Any]:
    grading_result = grading_body.get("grading_result") or {}
    action_result = action_body.get("grading_result") or {}
    action_task = action_body.get("review_task") or {}
    return {
        "action": action_name,
        "grading_run_id": grading_body["grading_run_id"],
        "review_task_id": grading_body["review_task_id"],
        "grading_result_id": grading_result.get("grading_result_id"),
        "ai_provider": (grading_body.get("ai_interaction") or {}).get("provider"),
        "ai_validation_status": (grading_body.get("ai_interaction") or {}).get("validation_status"),
        "decision": action_body["decision"],
        "review_task_status": action_task.get("status"),
        "grading_result_status": action_result.get("status"),
        "grading_result_type": action_result.get("result_type"),
        "teacher_review_id": action_body.get("teacher_review_id"),
        "teacher_override_id": action_body.get("teacher_override_id"),
        "regrade_run_id": action_body.get("regrade_run_id"),
    }


def _first_criterion_result(result: dict[str, Any]) -> dict[str, Any]:
    criteria = result.get("criterion_results")
    if not isinstance(criteria, list) or not criteria:
        raise SystemExit(f"Grading result did not include criterion results: {result}")
    criterion = criteria[0]
    if not isinstance(criterion, dict) or not criterion.get("criterion_key"):
        raise SystemExit(f"Criterion result was not usable: {criterion}")
    return criterion


def _score_below_max(max_score: Any) -> str:
    maximum = Decimal(str(max_score or "1"))
    if maximum <= Decimal("0.5"):
        return str(maximum)
    return str(maximum - Decimal("0.5"))


def _pilot_headers(sample_body: dict[str, Any], *, request_id: str) -> dict[str, str]:
    return {
        "X-Pilot-Actor-User-Id": sample_body["actor_user_id"],
        "X-Pilot-Organization-Id": sample_body["organization_id"],
        "X-Pilot-Roles": sample_body["role"],
        "X-Pilot-Request-Id": request_id,
    }


def _response_json(response: Any) -> dict[str, Any]:
    try:
        payload = response.json()
    except ValueError as exc:
        raise SystemExit(f"Response was not JSON: {response.text}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"Expected JSON object response: {payload}")
    return payload


def _require_status(status_code: int, expected: int, label: str, body: dict[str, Any]) -> None:
    if status_code != expected:
        raise SystemExit(f"{label} returned HTTP {status_code}: {body}")


if __name__ == "__main__":
    main()
