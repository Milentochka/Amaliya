"""projector_settings: single-row toggle for slideshow vs contests mode.

Revision ID: 0018_projector_settings
Revises: 0017_family_media
Create Date: 2026-05-24
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018_projector_settings"
down_revision: str | None = "0017_family_media"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "projector_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "contests_enabled",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.execute(
        "INSERT INTO projector_settings (id, contests_enabled) VALUES (1, false)"
    )


def downgrade() -> None:
    op.drop_table("projector_settings")
