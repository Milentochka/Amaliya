"""Add photos (jsonb) and additional_info to event_parts.

Revision ID: 0005_event_part_photos
Revises: 0004_event_info
Create Date: 2026-05-11
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_event_part_photos"
down_revision: str | None = "0004_event_info"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event_parts",
        sa.Column(
            "photos",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "event_parts",
        sa.Column("additional_info", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("event_parts", "additional_info")
    op.drop_column("event_parts", "photos")
