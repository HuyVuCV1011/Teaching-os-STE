import uuid
import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.models import Organization, FilePurpose, FileArtifact, KnowledgeSource
from app.worker import claim_next_knowledge_job, process_knowledge_source

# Reuse the db_session fixture from test_knowledge_library_db
from tests.test_knowledge_library_db import db_session

def test_claim_and_process_knowledge_job(db_session: Session) -> None:
    # 1. Create a dummy organization and purposes
    organization = Organization(
        name=f"Worker Test Org {uuid.uuid4()}",
        slug=f"worker-test-{uuid.uuid4()}",
        status="active",
    )
    db_session.add(organization)
    db_session.flush()

    knowledge_purpose = FilePurpose(
        organization_id=organization.id,
        key="knowledge_source",
        name="Knowledge Source",
        config={},
        status="active",
    )
    markdown_purpose = FilePurpose(
        organization_id=organization.id,
        key="converted_markdown",
        name="Converted Markdown",
        config={},
        status="active",
    )
    db_session.add_all([knowledge_purpose, markdown_purpose])
    db_session.flush()

    # 2. Insert a draft knowledge source in pending status
    source_artifact = FileArtifact(
        organization_id=organization.id,
        file_purpose_id=knowledge_purpose.id,
        original_filename="test_doc.md",
        normalized_filename="test_doc.md",
        file_extension="md",
        mime_type="text/markdown",
        detected_file_category="document",
        storage_uri="knowledge/test_doc.md",
        import_source="knowledge_library",
        source_type="knowledge_library",
        source_format="markdown",
        access_scope="organization",
        parser_support_status="supported",
        status="active",
        metadata_payload={},
    )
    db_session.add(source_artifact)
    db_session.flush()

    source = KnowledgeSource(
        organization_id=organization.id,
        source_file_artifact_id=source_artifact.id,
        title="Async Worker Test",
        version_number=1,
        access_scope="organization",
        conversion_status="pending",
        status="draft",
        metadata_payload={"source_format": "markdown"},
    )
    db_session.add(source)
    db_session.flush()
    db_session.commit() # commit is needed because claim_next_knowledge_job does an update which we want to test

    # Keep track of IDs for manual cleanup
    source_id = source.id
    source_artifact_id = source_artifact.id
    knowledge_purpose_id = knowledge_purpose.id
    markdown_purpose_id = markdown_purpose.id
    organization_id = organization.id
    updated_markdown_artifact_id = None

    try:
        # 3. Test claim_next_knowledge_job
        job = claim_next_knowledge_job(db_session)
        assert job is not None
        assert job["id"] == str(source_id)
        assert job["source_file_artifact_id"] == str(source_artifact_id)

        # The job should now be running
        db_session.commit()
        
        # 4. Test process_knowledge_source with mocked supabase
        dummy_content = b"# Async Worker Test\n\nThis is a mock knowledge chunk parsed by worker."
        with patch("app.worker.supabase_client") as mock_supabase:
            mock_supabase.storage.from_.return_value.download.return_value = dummy_content
            
            process_knowledge_source(db_session, job)
            
        # Re-fetch source to assert conversion_status and chunks
        db_session.commit()
        db_session.expire_all()
        updated_source = db_session.get(KnowledgeSource, source_id)
        assert updated_source is not None
        assert updated_source.conversion_status == "converted"
        assert updated_source.status == "active"
        updated_markdown_artifact_id = updated_source.converted_markdown_artifact_id
        
        # Verify chunks exist in DB
        chunks_count = db_session.scalar(
            text("SELECT COUNT(*) FROM public.knowledge_chunks WHERE knowledge_source_id = :sid"),
            {"sid": source_id}
        )
        assert chunks_count > 0
        
    finally:
        # Clean up database record manually since we committed
        db_session.execute(text("DELETE FROM public.knowledge_chunks WHERE knowledge_source_id = :sid"), {"sid": source_id})
        db_session.execute(text("DELETE FROM public.knowledge_sources WHERE id = :sid"), {"sid": source_id})
        db_session.execute(text("DELETE FROM public.artifact_conversions WHERE source_file_artifact_id = :aid"), {"aid": source_artifact_id})
        db_session.execute(text("DELETE FROM public.file_artifacts WHERE id = :aid"), {"aid": source_artifact_id})
        if updated_markdown_artifact_id:
            db_session.execute(text("DELETE FROM public.file_artifacts WHERE id = :aid"), {"aid": updated_markdown_artifact_id})
        db_session.execute(text("DELETE FROM public.file_purposes WHERE id = :pid"), {"pid": knowledge_purpose_id})
        db_session.execute(text("DELETE FROM public.file_purposes WHERE id = :pid"), {"pid": markdown_purpose_id})
        db_session.execute(text("DELETE FROM public.audit_events WHERE organization_id = :oid"), {"oid": organization_id})
        db_session.execute(text("DELETE FROM public.organizations WHERE id = :oid"), {"oid": organization_id})
        db_session.commit()
