"""family_media: photos + muted videos for the projector idle slideshow.

Revision ID: 0017_family_media
Revises: 0016_mary_jean_promises_english
Create Date: 2026-05-24
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017_family_media"
down_revision: str | None = "0016_mary_jean_promises_english"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "family_media",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("kind", sa.Text, nullable=False),  # 'photo' | 'video'
        sa.Column("filename", sa.Text, nullable=False, unique=True),
        sa.Column("order_index", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_family_media_order_index", "family_media", ["order_index"]
    )


def downgrade() -> None:
    op.drop_index("ix_family_media_order_index", table_name="family_media")
    op.drop_table("family_media")
