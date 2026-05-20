"""Contest 2: rebalance correct-answer positions across A/Б/В/Г.

Revision ID: 0013_contest2_shuffle
Revises: 0012_contest5_answer_images
Create Date: 2026-05-21

The original seed had 7/15 correct answers on position «Б», which made it
easy to guess. We re-shuffle options per-question so the correct answer is
spread roughly evenly: 4·А · 4·Б · 4·В · 3·Г.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013_contest2_shuffle"
down_revision: str | None = "0012_contest5_answer_images"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (order_index, new_options, new_correct_index)
NEW = [
    (1,  ["2023", "2018", "2019", "2024"],                                                    0),  # А
    (2,  ["через друзей", "в интернете", "на работе", "в путешествии"],                       1),  # Б
    (3,  ["1 января", "5 февраля", "31 декабря", "5 сентября"],                               2),  # В
    (4,  ["в ресторане", "на природе", "за границей", "дома"],                                3),  # Г
    (5,  ["вечером", "утром", "днём", "ночью"],                                               0),  # А
    (6,  ["3.75 кг", "4.17 кг", "2.71 кг", "3.22 кг"],                                        1),  # Б
    (7,  ["мама", "дай", "папа", "няня"],                                                     2),  # В
    (8,  ["гав", "Шелби", "шун", "би-би"],                                                    3),  # Г
    (9,  ["10 мес", "9 мес", "11 мес", "12 мес"],                                             0),  # А
    (10, ["8", "6", "10", "4"],                                                                1),  # Б
    (11, ["мандарин", "банановое пюре", "лаваш с маслом", "шашлык из свиной шеи"],            2),  # В
    (12, ["Москва", "Сочи", "Санкт-Петербург", "Армения"],                                    3),  # Г
    (13, ["Таджикистан", "Москва", "Подмосковье", "Казахстан"],                               0),  # А
    (14, ["просто красивое имя", "своей прабабушки", "своей бабушки", "своей троюродной тёти"], 1),  # Б
    (15, ["Ваге", "Андраник", "Владимир", "Арман"],                                            2),  # В
]


def upgrade() -> None:
    conn = op.get_bind()
    for order_index, options, correct in NEW:
        conn.execute(
            sa.text(
                "UPDATE contest2_question SET options = :opts, "
                "correct_index = :ci WHERE order_index = :oi"
            ).bindparams(sa.bindparam("opts", type_=postgresql.ARRAY(sa.Text))),
            {"opts": options, "ci": correct, "oi": order_index},
        )


def downgrade() -> None:
    # No-op — keeps the rebalanced layout.
    pass
