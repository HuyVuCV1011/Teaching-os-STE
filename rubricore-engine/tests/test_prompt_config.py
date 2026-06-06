import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db.models import PromptConfiguration, Organization
from app.ai.prompts import build_rubric_messages, DEFAULT_RAG_RUBRIC_TEMPLATE
from app.pilot.fastapi_app import create_app, get_fastapi_db, get_pilot_auth_context
from app.pilot.authz import PilotAuthContext, PilotRole


@pytest.fixture
def db_session() -> Iterator[Session]:
    try:
        database_url = get_settings().database_url
        engine = create_engine(database_url, pool_pre_ping=True)
        with engine.connect() as connection:
            required_tables = {"prompt_configurations", "organizations"}
            existing_tables = set(inspect(connection).get_table_names())
            if not required_tables.issubset(existing_tables):
                pytest.skip("Database is not migrated for prompt_configurations tests")
            
            if connection.in_transaction():
                connection.rollback()

            transaction = connection.begin()
            session = Session(bind=connection)
            try:
                yield session
            finally:
                session.close()
                transaction.rollback()
    except OperationalError as exc:
        pytest.skip(f"Database-backed tests require a reachable database: {exc}")


def test_build_rubric_messages_default_and_custom() -> None:
    # 1. Test Default template behavior
    messages_default = build_rubric_messages("Solve equation", "x = 5")
    assert messages_default[0]["role"] == "system"
    assert DEFAULT_RAG_RUBRIC_TEMPLATE in messages_default[0]["content"]
    assert "Solve equation" in messages_default[1]["content"]

    # 2. Test custom template override
    custom_template = "Custom grading template: criteria is important."
    messages_custom = build_rubric_messages("Solve equation", "x = 5", prompt_template=custom_template)
    assert messages_custom[0]["role"] == "system"
    assert custom_template in messages_custom[0]["content"]
    assert DEFAULT_RAG_RUBRIC_TEMPLATE not in messages_custom[0]["content"]

    # 3. Test custom template with knowledge dossier appended
    dossier = "Dossier concepts"
    messages_custom_dossier = build_rubric_messages(
        "Solve equation", "x = 5", knowledge_dossier=dossier, prompt_template=custom_template
    )
    assert custom_template in messages_custom_dossier[0]["content"]
    assert dossier in messages_custom_dossier[0]["content"]


def test_fastapi_prompt_config_get_and_post(db_session: Session) -> None:
    app = create_app()
    actor_user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    # Override auth context and db dependency
    app.dependency_overrides[get_pilot_auth_context] = lambda: PilotAuthContext(
        actor_user_id=actor_user_id,
        organization_id=org_id,
        roles=frozenset({PilotRole.ADMIN}),
        request_id="prompt-test",
    )
    app.dependency_overrides[get_fastapi_db] = lambda: db_session

    client = TestClient(app)

    # 1. GET non-existent config should fallback to DEFAULT_RAG_RUBRIC_TEMPLATE for 'rag_rubric_template' key
    response = client.get("/pilot/prompts/rag_rubric_template")
    assert response.status_code == 200
    assert response.json()["key"] == "rag_rubric_template"
    assert response.json()["prompt_text"] == DEFAULT_RAG_RUBRIC_TEMPLATE

    # 2. GET non-existent key that is not 'rag_rubric_template' should return 404
    response = client.get("/pilot/prompts/unknown_key")
    assert response.status_code == 404

    # 3. POST to create a custom prompt configuration
    custom_prompt = "Custom system instructions for grading"
    response = client.post(
        "/pilot/prompts/rag_rubric_template",
        json={"prompt_text": custom_prompt}
    )
    assert response.status_code == 200
    assert response.json()["key"] == "rag_rubric_template"
    assert response.json()["prompt_text"] == custom_prompt

    # 4. GET the saved prompt configuration and assert it returns the custom prompt text
    response = client.get("/pilot/prompts/rag_rubric_template")
    assert response.status_code == 200
    assert response.json()["prompt_text"] == custom_prompt

    # 5. POST to update the existing custom prompt configuration
    updated_prompt = "Updated system instructions"
    response = client.post(
        "/pilot/prompts/rag_rubric_template",
        json={"prompt_text": updated_prompt}
    )
    assert response.status_code == 200
    assert response.json()["prompt_text"] == updated_prompt

    # Cleanup dependency overrides
    app.dependency_overrides.clear()
