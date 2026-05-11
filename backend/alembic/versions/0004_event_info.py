"""Event info: event_meta, event_parts, parents (+ placeholder seed).

Revision ID: 0004_event_info
Revises: 0003_wishlist
Create Date: 2026-05-11
"""
from __future__ import annotations

import datetime as dt
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_event_info"
down_revision: str | None = "0003_wishlist"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


parent_role_enum = postgresql.ENUM(
    "mother", "father", name="parent_role", create_type=False
)
event_part_type_enum = postgresql.ENUM(
    "christening", "banquet", name="event_part_type", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE TYPE parent_role AS ENUM ('mother', 'father')")

    # event_meta
    op.create_table(
        "event_meta",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("dress_code", sa.Text, nullable=True),
        sa.Column("wishes", sa.Text, nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # event_parts
    op.create_table(
        "event_parts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("type", event_part_type_enum, unique=True, nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("yandex_maps_link", sa.Text, nullable=True),
        sa.Column("program", sa.Text, nullable=True),
    )

    # parents
    op.create_table(
        "parents",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("role", parent_role_enum, unique=True, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("photo_url", sa.Text, nullable=True),
        sa.Column("phone", sa.Text, nullable=True),
        sa.Column("telegram_username", sa.Text, nullable=True),
    )

    # ---- Seed: placeholders for the admin to fill in via Supabase ----

    meta_t = sa.table(
        "event_meta",
        sa.column("id", sa.Integer),
        sa.column("title", sa.Text),
        sa.column("dress_code", sa.Text),
        sa.column("wishes", sa.Text),
    )
    op.bulk_insert(
        meta_t,
        [
            {
                "id": 1,
                "title": "Крестины и день рождения Амалии",
                "dress_code": "Светлые тёплые тона, без обуви на каблуке (для церкви). На банкете — свободно.",
                "wishes": "Если что-то непонятно или пошло не так — звоните Милене или Микаелу. Мы будем рады видеть Вас рядом!",
            }
        ],
    )

    parts_t = sa.table(
        "event_parts",
        sa.column("id", sa.Integer),
        sa.column("type", event_part_type_enum),
        sa.column("start_time", sa.DateTime(timezone=True)),
        sa.column("address", sa.Text),
        sa.column("yandex_maps_link", sa.Text),
        sa.column("program", sa.Text),
    )
    op.bulk_insert(
        parts_t,
        [
            {
                "id": 1,
                "type": "christening",
                "start_time": dt.datetime(2026, 5, 24, 11, 0, tzinfo=dt.timezone.utc),
                "address": "Адрес храма — уточняется",
                "yandex_maps_link": None,
                "program": "11:00 — встреча гостей у входа\n11:15 — таинство Крещения\n12:30 — общая фотография",
            },
            {
                "id": 2,
                "type": "banquet",
                "start_time": dt.datetime(2026, 5, 24, 14, 0, tzinfo=dt.timezone.utc),
                "address": "Адрес банкетного зала — уточняется",
                "yandex_maps_link": None,
                "program": "14:00 — приветственный фуршет\n15:00 — поздравления\n16:00 — торт и игра «Ангел Амалия»\n17:00 — конкурсы",
            },
        ],
    )

    parents_t = sa.table(
        "parents",
        sa.column("id", sa.Integer),
        sa.column("role", parent_role_enum),
        sa.column("name", sa.Text),
        sa.column("photo_url", sa.Text),
        sa.column("phone", sa.Text),
        sa.column("telegram_username", sa.Text),
    )
    op.bulk_insert(
        parents_t,
        [
            {
                "id": 1,
                "role": "mother",
                "name": "Милена",
                "photo_url": None,
                "phone": None,
                "telegram_username": None,
            },
            {
                "id": 2,
                "role": "father",
                "name": "Микаел",
                "photo_url": None,
                "phone": None,
                "telegram_username": None,
            },
        ],
    )


def downgrade() -> None:
    op.drop_table("parents")
    op.drop_table("event_parts")
    op.drop_table("event_meta")
    op.execute("DROP TYPE IF EXISTS parent_role")
