"""Contest 4: append English translation to each Leo trait.

Revision ID: 0015_leo_english_traits
Revises: 0014_contest5_cartoons_rename
Create Date: 2026-05-24
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015_leo_english_traits"
down_revision: str | None = "0014_contest5_cartoons_rename"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (order_index, new_trait_text)
LEO_TRAITS = [
    (1,  "Щедрость / Generosity"),
    (2,  "Великодушие / Magnanimity"),
    (3,  "Творческое начало / Creativity"),
    (4,  "Оптимизм / Optimism"),
    (5,  "Уверенность в себе / Self-confidence"),
    (6,  "Гордыня / Pride"),
    (7,  "Тщеславие / Vanity"),
    (8,  "Властность / Domineering"),
    (9,  "Любовь к лести / Love of flattery"),
    (10, "Драматизм / Dramatism"),
]


def upgrade() -> None:
    for order_index, text in LEO_TRAITS:
        op.execute(
            sa.text(
                "UPDATE zodiac_trait_template SET trait_text = :t "
                "WHERE zodiac_key = 'leo' AND order_index = :i"
            ).bindparams(t=text, i=order_index)
        )


def downgrade() -> None:
    revert = [
        (1,  "Щедрость"),
        (2,  "Великодушие"),
        (3,  "Творческое начало"),
        (4,  "Оптимизм"),
        (5,  "Уверенность в себе"),
        (6,  "Гордыня"),
        (7,  "Тщеславие"),
        (8,  "Властность"),
        (9,  "Любовь к лести"),
        (10, "Драматизм"),
    ]
    for order_index, text in revert:
        op.execute(
            sa.text(
                "UPDATE zodiac_trait_template SET trait_text = :t "
                "WHERE zodiac_key = 'leo' AND order_index = :i"
            ).bindparams(t=text, i=order_index)
        )
