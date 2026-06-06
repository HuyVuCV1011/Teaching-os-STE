"""create_prompt_configurationr

Revision ID: 0e1353c65796
Revises: 0010_self_evolving_hierarchy
Create Date: 2026-06-06 03:48:17.908891

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0e1353c65796'
down_revision: Union[str, Sequence[str], None] = '0010_self_evolving_hierarchy'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('prompt_configurations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('key', sa.String(length=120), nullable=False),
        sa.Column('prompt_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_prompt_configurations')),
        sa.UniqueConstraint('key', name=op.f('uq_prompt_configurations_key'))
    )


def downgrade() -> None:
    op.drop_table('prompt_configurations')
