import sys
from pathlib import Path
import uuid

# Set up system paths for importing app modules
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.db.models import Organization, User, KnowledgeSource, FilePurpose
from app.db.services.knowledge_library import (
    register_knowledge_source,
    convert_knowledge_source_to_markdown,
    create_knowledge_chunks
)

def _seed_file_purposes(db, organization):
    records = [
        ("assessment_material", "Assessment Material"),
        ("answer_key_source", "Answer Key Source"),
        ("submission_evidence", "Submission Evidence"),
        ("reference_solution", "Reference Solution"),
        ("extracted_representation", "Extracted Representation"),
        ("rubric_source", "Rubric Source"),
        ("knowledge_source", "Knowledge Source"),
        ("converted_markdown", "Converted Markdown"),
    ]
    for key, name in records:
        exists = db.query(FilePurpose).filter(
            FilePurpose.organization_id == organization.id,
            FilePurpose.key == key
        ).first()
        if exists is None:
            db.add(
                FilePurpose(
                    organization_id=organization.id,
                    key=key,
                    name=name,
                    config={"schema_version": "1.0"},
                    status="active"
                )
            )
    db.flush()

def seed_custom_rag_docs():
    print("🚀 Seeding Python RAG Guides directly into the database...")
    db = SessionLocal()
    try:
        # 1. Resolve seeded local-development organization
        org = db.query(Organization).filter(Organization.slug == "local-development").first()
        if not org:
            print("❌ 'local-development' organization not found. Seeding first...")
            org = Organization(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                name="Local Development Organization",
                slug="local-development",
                status="active"
            )
            db.add(org)
            db.flush()
        
        # 2. Resolve seeded admin user
        admin = db.query(User).filter(User.email == "admin@example.local").first()
        if not admin:
            print("❌ 'admin@example.local' user not found. Seeding first...")
            admin = User(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                organization_id=org.id,
                email="admin@example.local",
                display_name="Development Admin",
                role="admin",
                status="active"
            )
            db.add(admin)
            db.flush()

        # 3. Seed required File Purposes
        _seed_file_purposes(db, org)
        print("✓ File purposes seeded successfully.")

        # 4. Read seed markdown files
        seed_dir = Path(__file__).resolve().parents[2] / "knowledge_seed"
        if not seed_dir.exists():
            print(f"❌ Seed directory {seed_dir} does not exist.")
            return

        files_to_seed = [
            {
                "file_name": "python_pep8_standards.md",
                "title": "Python PEP 8 Standards and Naming Guide",
                "summary": "Official style guidelines, variables & function naming rules, docstrings configurations, and spacing parameters for clean Python programming."
            },
            {
                "file_name": "python_performance_tricks.md",
                "title": "Pythonic Idioms & Speed Optimizations",
                "summary": "Enforces performance recommendations comparing list comprehensions, lazy generators, and standard dictionary defaults get lookup patterns."
            },
            {
                "file_name": "python_robust_exceptions.md",
                "title": "Python Exception Handling and Safety Boundaries",
                "summary": "Enforces error boundary architecture avoiding bare exceptions, demonstrating clean try-except-else-finally blocks, and custom class exceptions."
            }
        ]

        for file_info in files_to_seed:
            file_path = seed_dir / file_info["file_name"]
            if not file_path.exists():
                print(f"⚠️ Seed file {file_path.name} not found. Skipping.")
                continue
            
            # Check if source already seeded
            exists = db.query(KnowledgeSource).filter(
                KnowledgeSource.organization_id == org.id,
                KnowledgeSource.title == file_info["title"]
            ).first()
            if exists:
                print(f"✓ Source '{file_info['title']}' already exists. Skipping.")
                continue

            content = file_path.read_text(encoding="utf-8")
            storage_uri = f"seed://knowledge/{org.id}/{file_info['file_name']}"

            # Ingest RAG source
            source = register_knowledge_source(
                db,
                organization_id=org.id,
                owner_user_id=admin.id,
                title=file_info["title"],
                source_filename=file_info["file_name"],
                source_storage_uri=storage_uri,
                access_scope="organization",
                source_type="fixture_import",
                summary=file_info["summary"],
                actor_source="fixture_import",
                reason="Automatic workspace RAG seed."
            )
            
            # Convert to markdown
            convert_knowledge_source_to_markdown(
                db,
                knowledge_source=source,
                source_filename=file_info["file_name"],
                source_content=content,
                markdown_storage_uri=f"derived://knowledge/{source.id}/{file_info['file_name']}",
                actor_user_id=admin.id,
                actor_source="fixture_import",
                reason="Automatic RAG Markdown conversion."
            )

            # Generate chunks and embeddings
            create_knowledge_chunks(
                db,
                knowledge_source=source,
                markdown_content=content,
                actor_user_id=admin.id,
                actor_source="fixture_import",
                reason="Automatic RAG chunks and vector indexing."
            )
            print(f"✅ Ingested, chunked, and RAG indexed: {file_info['title']}")

        db.commit()
        print("🎉 Seeding RAG guides successfully completed!")
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to seed RAG: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_custom_rag_docs()
