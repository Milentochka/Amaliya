"""Contest 1 «На кого похожа» + shared contest_state.

Revision ID: 0007_contest1
Revises: 0006_game_attempts
Create Date: 2026-05-14
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_contest1"
down_revision: str | None = "0006_game_attempts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


TRAITS = [
    "Глазки",
    "Носик",
    "Бровки",
    "Овал лица",
    "Рот / губы",
    "Щёчки",
    "Цвет волос",
    "Ушки",
    "Ножки",
    "Ручки",
    "Улыбка",
    "Смех",
    "Как плачет / капризничает",
    "Любопытство",
    "Упрямство / настойчивость",
    "Голос / интонации",
]


def upgrade() -> None:
    op.create_table(
        "contest_state",
        sa.Column("contest_id", sa.Integer, primary_key=True),
        sa.Column(
            "status",
            sa.Enum(
                "not_started",
                "active",
                "closed",
                name="contest_status",
            ),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column(
            "active_step",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "contest1_trait",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("order_index", sa.Integer, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
    )
    op.create_index(
        "ix_contest1_trait_order", "contest1_trait", ["order_index"]
    )

    op.create_table(
        "contest1_vote_tally",
        sa.Column(
            "trait_id",
            sa.Integer,
            sa.ForeignKey("contest1_trait.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("votes_mom", sa.Integer, nullable=False, server_default="0"),
        sa.Column("votes_dad", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "votes_unique", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "votes_relatives",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )

    # Seed traits + zero tallies + contest_state rows for all 4 contests.
    trait_table = sa.table(
        "contest1_trait",
        sa.column("id", sa.Integer),
        sa.column("order_index", sa.Integer),
        sa.column("name", sa.Text),
    )
    tally_table = sa.table(
        "contest1_vote_tally", sa.column("trait_id", sa.Integer)
    )
    state_table = sa.table(
        "contest_state", sa.column("contest_id", sa.Integer)
    )
    op.bulk_insert(
        trait_table,
        [
            {"id": i + 1, "order_index": i + 1, "name": t}
            for i, t in enumerate(TRAITS)
        ],
    )
    op.bulk_insert(
        tally_table, [{"trait_id": i + 1} for i in range(len(TRAITS))]
    )
    op.bulk_insert(
        state_table, [{"contest_id": cid} for cid in (1, 2, 3, 4)]
    )


def downgrade() -> None:
    op.drop_table("contest1_vote_tally")
    op.drop_index("ix_contest1_trait_order", table_name="contest1_trait")
    op.drop_table("contest1_trait")
    op.drop_table("contest_state")
    sa.Enum(name="contest_status").drop(op.get_bind(), checkfirst=True)
