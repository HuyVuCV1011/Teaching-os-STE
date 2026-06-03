"""refined knowledge system

Revision ID: 0009_refined_knowledge_system
Revises: 0008_rag_vector_foundation
Create Date: 2026-06-03
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0009_refined_knowledge_system"
down_revision: str | None = "0008_rag_vector_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    # 1. Create knowledge_topics table (hierarchical structure supporting parent_id self-ref)
    op.create_table(
        "knowledge_topics",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("subject_id", sa.UUID(), nullable=True),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_id"], ["knowledge_topics.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_knowledge_topics_org", "knowledge_topics", ["organization_id"])
    op.create_index("ix_knowledge_topics_parent", "knowledge_topics", ["parent_id"])
    op.create_index("ix_knowledge_topics_subject", "knowledge_topics", ["subject_id"])

    # 2. Create refined_knowledge_entries table (concept details referencing knowledge_topics.id)
    op.create_table(
        "refined_knowledge_entries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("topic_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("knowledge_type", sa.String(length=50), nullable=False),
        sa.Column("tags", JSONB(), nullable=False, server_default="[]"),
        sa.Column("prerequisites", JSONB(), nullable=False, server_default="[]"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_id"], ["knowledge_topics.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_refined_knowledge_entries_org", "refined_knowledge_entries", ["organization_id"])
    op.create_index("ix_refined_knowledge_entries_topic", "refined_knowledge_entries", ["topic_id"])
    
    # 3. Add embedding vector column to refined_knowledge_entries
    op.execute("ALTER TABLE refined_knowledge_entries ADD COLUMN IF NOT EXISTS embedding vector(768);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_refined_knowledge_entries_embedding ON refined_knowledge_entries USING hnsw (embedding vector_cosine_ops);")

    # 4. Create refined_knowledge_links table (tracks source provenance)
    op.create_table(
        "refined_knowledge_links",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("entry_id", sa.UUID(), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("source_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["entry_id"], ["refined_knowledge_entries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_refined_knowledge_links_entry", "refined_knowledge_links", ["entry_id"])
    op.create_index("ix_refined_knowledge_links_source", "refined_knowledge_links", ["source_id"])

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_refined_knowledge_entries_embedding;")
    op.drop_table("refined_knowledge_links")
    op.drop_table("refined_knowledge_entries")
    op.drop_table("knowledge_topics")
