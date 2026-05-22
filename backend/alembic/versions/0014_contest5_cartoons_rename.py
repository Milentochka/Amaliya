"""Contest 5: rename "Мультфильмы" → "Мультики" so the title fits the cell.

Revision ID: 0014_contest5_cartoons_rename
Revises: 0013_contest2_shuffle
Create Date: 2026-05-22
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014_contest5_cartoons_rename"
down_revision: str | None = "0013_contest2_shuffle"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE contest5_category SET name = 'Мультики' WHERE slug = 'cartoons'"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE contest5_category SET name = 'Мультфильмы' WHERE slug = 'cartoons'"
        )
    )
