"""self evolving hierarchy

Revision ID: 0010_self_evolving_hierarchy
Revises: 0009_refined_knowledge_system
Create Date: 2026-06-03
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "0010_self_evolving_hierarchy"
down_revision: str | None = "0009_refined_knowledge_system"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create knowledge_domains table
    op.create_table(
        "knowledge_domains",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_domains_org_name")
    )
    op.create_index("ix_knowledge_domains_org", "knowledge_domains", ["organization_id"])

    # 2. Add domain_id column to subjects table (managed by Supabase, but mapped here too)
    op.add_column("subjects", sa.Column("domain_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_subjects_domain",
        "subjects",
        "knowledge_domains",
        ["domain_id"],
        ["id"],
        ondelete="SET NULL"
    )
    op.create_index("ix_subjects_domain", "subjects", ["domain_id"])

    # 3. Add subject_id column to refined_knowledge_entries
    op.add_column("refined_knowledge_entries", sa.Column("subject_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_entries_subject",
        "refined_knowledge_entries",
        "subjects",
        ["subject_id"],
        ["id"],
        ondelete="CASCADE"
    )
    op.create_index("ix_refined_knowledge_entries_subject", "refined_knowledge_entries", ["subject_id"])

    # 4. Create knowledge_tags table
    op.create_table(
        "knowledge_tags",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_tags_org_name")
    )

    # 5. Create concept_tags junction table
    op.create_table(
        "concept_tags",
        sa.Column("concept_id", sa.UUID(), nullable=False),
        sa.Column("tag_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["refined_knowledge_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["knowledge_tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("concept_id", "tag_id")
    )
    op.create_index("ix_concept_tags_concept", "concept_tags", ["concept_id"])
    op.create_index("ix_concept_tags_tag", "concept_tags", ["tag_id"])


def downgrade() -> None:
    op.drop_index("ix_concept_tags_tag")
    op.drop_index("ix_concept_tags_concept")
    op.drop_table("concept_tags")
    op.drop_table("knowledge_tags")

    op.drop_constraint("fk_entries_subject", "refined_knowledge_entries", type_="foreignkey")
    op.drop_index("ix_refined_knowledge_entries_subject", "refined_knowledge_entries")
    op.drop_column("refined_knowledge_entries", "subject_id")

    op.drop_constraint("fk_subjects_domain", "subjects", type_="foreignkey")
    op.drop_index("ix_subjects_domain", "subjects")
    op.drop_column("subjects", "domain_id")

    op.drop_index("ix_knowledge_domains_org")
    op.drop_table("knowledge_domains")
