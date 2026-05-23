"""Contest 3: append English translation to Mary Jean's two promises.

Revision ID: 0016_mary_jean_promises_english
Revises: 0015_leo_english_traits
Create Date: 2026-05-24

Mary Jean is an English-speaking guest. Her two assigned promises (ids 7
and 37) get an English line appended below the Russian original, separated
by a newline that the projector view renders via `whitespace-pre-line`.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016_mary_jean_promises_english"
down_revision: str | None = "0015_leo_english_traits"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


PROMISES = [
    (
        7,
        "Обещаю свозить тебя в зоопарк и долго объяснять, кто такая капибара.\n"
        "I promise to take you to the zoo and tell you all about capybaras.",
    ),
    (
        37,
        "Обещаю давать сладости перед обедом со словами «маме не скажу».\n"
        "I promise to sneak you sweets before dinner saying «I won't tell mom».",
    ),
]


def upgrade() -> None:
    for promise_id, text in PROMISES:
        op.execute(
            sa.text(
                "UPDATE contest3_promise SET text = :t WHERE id = :id"
            ).bindparams(t=text, id=promise_id)
        )


def downgrade() -> None:
    revert = [
        (7,  "Обещаю свозить тебя в зоопарк и долго объяснять, кто такая капибара."),
        (37, "Обещаю давать сладости перед обедом со словами «маме не скажу»."),
    ]
    for promise_id, text in revert:
        op.execute(
            sa.text(
                "UPDATE contest3_promise SET text = :t WHERE id = :id"
            ).bindparams(t=text, id=promise_id)
        )
