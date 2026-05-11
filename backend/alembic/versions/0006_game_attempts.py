"""game_attempts table.

Revision ID: 0006_game_attempts
Revises: 0005_event_part_photos
Create Date: 2026-05-11
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_game_attempts"
down_revision: str | None = "0005_event_part_photos"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "game_attempts",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column(
            "guest_id",
            sa.Uuid,
            sa.ForeignKey("guests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column(
            "played_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_game_attempts_guest_id", "game_attempts", ["guest_id"])
    op.create_index("ix_game_attempts_played_at", "game_attempts", ["played_at"])


def downgrade() -> None:
    op.drop_index("ix_game_attempts_played_at", table_name="game_attempts")
    op.drop_index("ix_game_attempts_guest_id", table_name="game_attempts")
    op.drop_table("game_attempts")
