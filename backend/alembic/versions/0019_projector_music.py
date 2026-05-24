"""Add music_enabled + music_volume columns to projector_settings.

Revision ID: 0019_projector_music
Revises: 0018_projector_settings
Create Date: 2026-05-24
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019_projector_music"
down_revision: str | None = "0018_projector_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projector_settings",
        sa.Column(
            "music_enabled",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "projector_settings",
        sa.Column(
            "music_volume",
            sa.Integer,
            nullable=False,
            server_default="70",
        ),
    )


def downgrade() -> None:
    op.drop_column("projector_settings", "music_volume")
    op.drop_column("projector_settings", "music_enabled")
