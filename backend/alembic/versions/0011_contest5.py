"""Contest 5 «Своя игра»: categories, questions, teams.

Revision ID: 0011_contest5
Revises: 0010_contest4
Create Date: 2026-05-19
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011_contest5"
down_revision: str | None = "0010_contest4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CATEGORIES = [
    (1, "Древняя Армения", "armenia"),
    (2, "Амалия", "amalia"),
    (3, "ММА", "mma"),
    (4, "Мультфильмы", "cartoons"),
    (5, "Сказки", "tales"),
]

# (category_id, value, text, answer, image_key|None)
QUESTIONS = [
    # Armenia
    (1, 100, "Какой народ первым в мире принял христианство как государственную религию и в каком году?", "Армяне, 301 г.", None),
    (1, 200, "Армянское название двух вершин горы, которая является национальным символом Армении?", "Сис и Масис", "armenia_200"),
    (1, 300, "Кто создал армянский алфавит в 405 году?", "Месроп Маштоц", "armenia_300"),
    (1, 400, "Как называется древнее государство, существовавшее на территории нынешней Армении до нашей эры?", "Урарту", None),
    (1, 500, "При каком армянском царе территория Великой Армении простиралась от Средиземного и Чёрного морей на западе до Каспийского моря на востоке в I веке до н.э.?", "Тигран II Великий", "armenia_500"),

    # Amalia
    (2, 100, "В какой день недели родилась Амалия?", "Суббота", None),
    (2, 200, "Под каким знаком зодиака Амалия?", "Близнецы", None),
    (2, 300, "Какое животное больше всего понравилось Амалии в зоопарке?", "Лев", None),
    (2, 400, "Какую профессию выбрала Амалия на Атамхатик?", "Учёный в области медицины", None),
    (2, 500, "Кем хочет стать Амалия, когда вырастет (по версии папы)?", "Программистом", None),

    # MMA
    (3, 100, "Как будут звать следующего ребёнка Микаела и Милены?", "Лилит", None),
    (3, 200, "Сколько детей планируют Микаел и Милена?", "3", None),
    (3, 300, "Любимый цвет семьи Матасянц?", "Зелёный", None),
    (3, 400, "В честь кого названы питомцы семьи Матасянц?", "Умка (мультик), Гава (мультик), Шелби (сериал «Острые козырьки»)", None),
    (3, 500, "Какое блюдо лучше всего готовит мама Амалии по версии папы?", "Чебуреки и котлеты", None),

    # Cartoons
    (4, 100, "Как зовут пса дяди Фёдора из «Простоквашино»?", "Шарик", None),
    (4, 200, "Из какого мультфильма фраза «Ребята, давайте жить дружно»?", "«Кот Леопольд»", None),
    (4, 300, "В честь кого или чего названа старуха Шапокляк?", "В честь редкого головного убора — складного мужского цилиндра (шапокляка)", "cartoons_300"),
    (4, 400, "Какое имя у львёнка из «Как львёнок и черепаха пели песню»?", "Р-р-мяу", "cartoons_400"),
    (4, 500, "В каком мультфильме поют песню «Луч солнца золотого»?", "«Бременские музыканты»", None),

    # Tales
    (5, 100, "Кто катится по дорожке и поёт «я от бабушки ушёл»?", "Колобок", None),
    (5, 200, "Какой сказочный герой от рождения владел тремя языками?", "Змей Горыныч", None),
    (5, 300, "Кто помог Ивану-царевичу добыть Жар-птицу?", "Серый Волк", None),
    (5, 400, "Сколько богатырей в сказке Пушкина «О мёртвой царевне»?", "Семь", None),
    (5, 500, "Как звали трёх медведей из одноимённой сказки?", "Михайло Иванович, Настасья Петровна и Мишутка", None),
]

FINAL_QUESTION = (
    "Сколько букв в полном имени Амалии (с фамилией и отчеством)?",
    "24 буквы (Матасянц 8 + Амалия 6 + Микаеловна 10)",
)


def upgrade() -> None:
    op.create_table(
        "contest5_category",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("slug", sa.Text, nullable=False),
        sa.Column("order_index", sa.Integer, nullable=False),
    )

    op.create_table(
        "contest5_team",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("color", sa.Text, nullable=False, server_default="#c4897a"),
        sa.Column("score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("final_wager", sa.Integer, nullable=False, server_default="0"),
        sa.Column("final_correct", sa.Boolean, nullable=True),
        sa.Column("order_index", sa.Integer, nullable=False, server_default="1"),
    )

    op.create_table(
        "contest5_question",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "category_id",
            sa.Integer,
            sa.ForeignKey("contest5_category.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("value", sa.Integer, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("answer", sa.Text, nullable=False),
        sa.Column("image_key", sa.Text, nullable=True),
        sa.Column(
            "answered_status",
            sa.Text,
            nullable=False,
            server_default="unanswered",  # unanswered | correct | wrong | skipped
        ),
        sa.Column(
            "answered_team_id",
            sa.Integer,
            sa.ForeignKey("contest5_team.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_contest5_question_cat_value",
        "contest5_question",
        ["category_id", "value"],
    )

    op.create_table(
        "contest5_final",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("answer", sa.Text, nullable=False),
        sa.Column("revealed", sa.Boolean, nullable=False, server_default="false"),
    )

    # Seeds
    cat_t = sa.table(
        "contest5_category",
        sa.column("id", sa.Integer),
        sa.column("name", sa.Text),
        sa.column("slug", sa.Text),
        sa.column("order_index", sa.Integer),
    )
    op.bulk_insert(
        cat_t,
        [
            {"id": cid, "name": name, "slug": slug, "order_index": i}
            for i, (cid, name, slug) in enumerate(CATEGORIES, start=1)
        ],
    )

    q_t = sa.table(
        "contest5_question",
        sa.column("category_id", sa.Integer),
        sa.column("value", sa.Integer),
        sa.column("text", sa.Text),
        sa.column("answer", sa.Text),
        sa.column("image_key", sa.Text),
    )
    op.bulk_insert(
        q_t,
        [
            {
                "category_id": cat,
                "value": val,
                "text": text,
                "answer": ans,
                "image_key": img,
            }
            for cat, val, text, ans, img in QUESTIONS
        ],
    )

    f_t = sa.table(
        "contest5_final",
        sa.column("id", sa.Integer),
        sa.column("text", sa.Text),
        sa.column("answer", sa.Text),
    )
    op.bulk_insert(
        f_t,
        [{"id": 1, "text": FINAL_QUESTION[0], "answer": FINAL_QUESTION[1]}],
    )

    # Seed two default teams (admin can rename)
    team_t = sa.table(
        "contest5_team",
        sa.column("id", sa.Integer),
        sa.column("name", sa.Text),
        sa.column("color", sa.Text),
        sa.column("order_index", sa.Integer),
    )
    op.bulk_insert(
        team_t,
        [
            {"id": 1, "name": "Команда 1", "color": "#c4897a", "order_index": 1},
            {"id": 2, "name": "Команда 2", "color": "#7d6c5f", "order_index": 2},
        ],
    )


def downgrade() -> None:
    op.drop_table("contest5_final")
    op.drop_index(
        "ix_contest5_question_cat_value", table_name="contest5_question"
    )
    op.drop_table("contest5_question")
    op.drop_table("contest5_team")
    op.drop_table("contest5_category")


# Need to drop the half-created table from the previous failed run (if any)
# to keep this migration idempotent on retry.
