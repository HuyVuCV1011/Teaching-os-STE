"""rag vector foundation

Revision ID: 0008_rag_vector_foundation
Revises: 0007_knowledge_library_phase_2
Create Date: 2026-06-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0008_rag_vector_foundation"
down_revision: str | None = "0007_knowledge_library_phase_2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Enable the pgvector extension on the Postgres server
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    
    # 2. Add high-dimensional vector column to knowledge_chunks (standardizing on 768 dimensions for Gemini API embedding models)
    op.execute("ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);")
    
    # 3. Create Hierarchical Navigable Small World (HNSW) cosine similarity search index
    op.execute("CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);")


def downgrade() -> None:
    # 1. Drop the HNSW cosine similarity search index
    op.execute("DROP INDEX IF EXISTS ix_knowledge_chunks_embedding;")
    
    # 2. Drop the embedding vector column
    op.drop_column("knowledge_chunks", "embedding")
