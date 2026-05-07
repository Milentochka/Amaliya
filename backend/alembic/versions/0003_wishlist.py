"""Wishlist items + bookings.

Revision ID: 0003_wishlist
Revises: 0002_rsvp
Create Date: 2026-05-07
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_wishlist"
down_revision: str | None = "0002_rsvp"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


priority_enum = postgresql.ENUM(
    "high", "normal", name="wishlist_priority", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE TYPE wishlist_priority AS ENUM ('high', 'normal')")

    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("photo_url", sa.Text, nullable=True),
        sa.Column("price_rub", sa.Integer, nullable=True),
        sa.Column("ozon_url", sa.Text, nullable=True),
        sa.Column("category", sa.Text, nullable=True),
        sa.Column(
            "priority",
            priority_enum,
            nullable=False,
            server_default="normal",
        ),
        sa.Column(
            "can_be_shared", sa.Boolean, server_default=sa.text("false"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "bookings",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column(
            "item_id",
            sa.Uuid,
            sa.ForeignKey("wishlist_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "guest_id",
            sa.Uuid,
            sa.ForeignKey("guests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("comment", sa.Text, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("item_id", "guest_id", name="uq_booking_item_guest"),
    )
    op.create_index("ix_bookings_item_id", "bookings", ["item_id"])
    op.create_index("ix_bookings_guest_id", "bookings", ["guest_id"])


def downgrade() -> None:
    op.drop_index("ix_bookings_guest_id", table_name="bookings")
    op.drop_index("ix_bookings_item_id", table_name="bookings")
    op.drop_table("bookings")
    op.drop_table("wishlist_items")
    op.execute("DROP TYPE IF EXISTS wishlist_priority")
