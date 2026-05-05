"""RSVP table for guests on Christening and Banquet.

Revision ID: 0002_rsvp
Revises: 0001_initial_module1
Create Date: 2026-05-06
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_rsvp"
down_revision: str | None = "0001_initial_module1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


event_part_type_enum = postgresql.ENUM(
    "christening", "banquet", name="event_part_type", create_type=False
)
rsvp_status_enum = postgresql.ENUM(
    "coming", "not_coming", "maybe", name="rsvp_status", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE TYPE event_part_type AS ENUM ('christening', 'banquet')")
    op.execute("CREATE TYPE rsvp_status AS ENUM ('coming', 'not_coming', 'maybe')")

    op.create_table(
        "rsvp",
        sa.Column(
            "guest_id",
            sa.Uuid,
            sa.ForeignKey("guests.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("event_part_type", event_part_type_enum, primary_key=True),
        sa.Column("status", rsvp_status_enum, nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("rsvp")
    op.execute("DROP TYPE IF EXISTS rsvp_status")
    op.execute("DROP TYPE IF EXISTS event_part_type")
