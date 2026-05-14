"""Contest 2 «Знаете ли вы»: questions + first-correct.

Revision ID: 0008_contest2
Revises: 0007_contest1
Create Date: 2026-05-15
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_contest2"
down_revision: str | None = "0007_contest1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


QUESTIONS = [
    # (text, [4 options], correct_index 0..3)
    ("В каком году Микаел и Милена познакомились?",
     ["2018", "2019", "2023", "2024"], 2),
    ("Где они познакомились?",
     ["на работе", "через друзей", "в интернете", "в путешествии"], 2),
    ("Какого числа официально зарегистрировали свою новую ячейку общества?",
     ["5 февраля", "5 сентября", "31 декабря", "1 января"], 2),
    ("Где Микаел сделал предложение?",
     ["дома", "в ресторане", "за границей", "на природе"], 0),
    ("Во сколько родилась Амалия?",
     ["утром", "днём", "вечером", "ночью"], 2),
    ("Сколько весила при рождении?",
     ["2.71 кг", "3.22 кг", "3.75 кг", "4.17 кг"], 3),
    ("Какое первое слово Амалии?",
     ["мама", "папа", "дай", "няня"], 1),
    ("Как Амалия называет Шелби (собаку)?",
     ["гав", "би-би", "Шелби", "шун"], 1),
    ("Когда сделала первые шаги?",
     ["9 мес", "10 мес", "11 мес", "12 мес"], 1),
    ("Сколько у неё сейчас зубов?",
     ["4", "6", "8", "10"], 1),
    ("Какое блюдо любит больше всего?",
     ["банановое пюре", "лаваш с маслом", "мандарин", "шашлык из свиной шеи"], 1),
    ("Откуда родом папа?",
     ["Москва", "Армения", "Санкт-Петербург", "Сочи"], 1),
    ("Откуда родом мама?",
     ["Москва", "Подмосковье", "Казахстан", "Таджикистан"], 3),
    ("В честь кого названа Амалия?",
     ["просто красивое имя", "своей прабабушки", "своей троюродной тёти", "своей бабушки"], 1),
    ("Имя самого ответственного и горячо любимого крёстного?",
     ["Владимир", "Ваге", "Арман", "Андраник"], 0),
]


def upgrade() -> None:
    op.create_table(
        "contest2_question",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("order_index", sa.Integer, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("options", postgresql.ARRAY(sa.Text), nullable=False),
        sa.Column("correct_index", sa.Integer, nullable=False),
    )
    op.create_index(
        "ix_contest2_question_order", "contest2_question", ["order_index"]
    )

    op.create_table(
        "contest2_first_correct",
        sa.Column(
            "question_id",
            sa.Integer,
            sa.ForeignKey("contest2_question.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "guest_id",
            sa.Uuid,
            sa.ForeignKey("guests.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("guest_name", sa.Text, nullable=True),
        sa.Column(
            "set_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    q_table = sa.table(
        "contest2_question",
        sa.column("id", sa.Integer),
        sa.column("order_index", sa.Integer),
        sa.column("text", sa.Text),
        sa.column("options", postgresql.ARRAY(sa.Text)),
        sa.column("correct_index", sa.Integer),
    )
    op.bulk_insert(
        q_table,
        [
            {
                "id": i + 1,
                "order_index": i + 1,
                "text": t,
                "options": opts,
                "correct_index": ci,
            }
            for i, (t, opts, ci) in enumerate(QUESTIONS)
        ],
    )


def downgrade() -> None:
    op.drop_table("contest2_first_correct")
    op.drop_index("ix_contest2_question_order", table_name="contest2_question")
    op.drop_table("contest2_question")
