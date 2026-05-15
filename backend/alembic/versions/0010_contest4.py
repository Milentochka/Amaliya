"""Contest 4 «Знак зодиака»: 12 × 10 traits template.

Revision ID: 0010_contest4
Revises: 0009_contest3
Create Date: 2026-05-15
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_contest4"
down_revision: str | None = "0009_contest3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (key, ru_name, glyph, [10 traits])
ZODIACS = [
    ("aries", "Овен", "♈", [
        "Лидерство",
        "Смелость",
        "Энергичность",
        "Решительность",
        "Прямолинейность",
        "Импульсивность",
        "Нетерпеливость",
        "Эгоистичность",
        "Вспыльчивость",
        "Упрямство",
    ]),
    ("taurus", "Телец", "♉", [
        "Надёжность",
        "Терпение",
        "Практичность",
        "Преданность",
        "Любовь к комфорту",
        "Упрямство",
        "Лень",
        "Ревнивость",
        "Материализм",
        "Чувственность",
    ]),
    ("gemini", "Близнецы", "♊", [
        "Любознательность",
        "Общительность",
        "Острый ум",
        "Адаптивность",
        "Чувство юмора",
        "Двойственность",
        "Непостоянство",
        "Болтливость",
        "Нерешительность",
        "Поверхностность",
    ]),
    ("cancer", "Рак", "♋", [
        "Заботливость",
        "Чуткость",
        "Эмпатия",
        "Привязанность к семье",
        "Хорошая память",
        "Обидчивость",
        "Капризность",
        "Замкнутость",
        "Эмоциональность",
        "Скрытность",
    ]),
    ("leo", "Лев", "♌", [
        "Щедрость",
        "Великодушие",
        "Творческое начало",
        "Оптимизм",
        "Уверенность в себе",
        "Гордыня",
        "Тщеславие",
        "Властность",
        "Любовь к лести",
        "Драматизм",
    ]),
    ("virgo", "Дева", "♍", [
        "Аккуратность",
        "Внимание к деталям",
        "Аналитический ум",
        "Трудолюбие",
        "Скромность",
        "Перфекционизм",
        "Критичность",
        "Беспокойство",
        "Замкнутость",
        "Излишняя самокритика",
    ]),
    ("libra", "Весы", "♎", [
        "Чувство справедливости",
        "Дипломатичность",
        "Эстетический вкус",
        "Обаяние",
        "Доброжелательность",
        "Нерешительность",
        "Стремление угодить всем",
        "Поверхностность",
        "Зависимость от чужого мнения",
        "Лень в принятии решений",
    ]),
    ("scorpio", "Скорпион", "♏", [
        "Целеустремлённость",
        "Интуиция",
        "Глубина чувств",
        "Преданность",
        "Сила воли",
        "Ревнивость",
        "Скрытность",
        "Мстительность",
        "Подозрительность",
        "Упрямство",
    ]),
    ("sagittarius", "Стрелец", "♐", [
        "Оптимизм",
        "Любовь к свободе",
        "Тяга к приключениям",
        "Честность",
        "Великодушие",
        "Беспечность",
        "Прямолинейность",
        "Непоседливость",
        "Безответственность",
        "Излишняя самоуверенность",
    ]),
    ("capricorn", "Козерог", "♑", [
        "Целеустремлённость",
        "Дисциплинированность",
        "Ответственность",
        "Терпение",
        "Практичность",
        "Пессимизм",
        "Скупость",
        "Холодность",
        "Замкнутость",
        "Карьеризм",
    ]),
    ("aquarius", "Водолей", "♒", [
        "Оригинальность",
        "Независимость",
        "Дружелюбие",
        "Гуманизм",
        "Креативность",
        "Эксцентричность",
        "Отстранённость",
        "Упрямство",
        "Непредсказуемость",
        "Холодность в общении",
    ]),
    ("pisces", "Рыбы", "♓", [
        "Эмпатия",
        "Воображение",
        "Артистичность",
        "Доброта",
        "Интуиция",
        "Мечтательность (как уход от реальности)",
        "Излишняя жертвенность",
        "Нерешительность",
        "Чрезмерная чувствительность",
        "Склонность к самообману",
    ]),
]


def upgrade() -> None:
    op.create_table(
        "zodiac_trait_template",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("zodiac_key", sa.Text, nullable=False),
        sa.Column("zodiac_name", sa.Text, nullable=False),
        sa.Column("glyph", sa.Text, nullable=False),
        sa.Column("order_index", sa.Integer, nullable=False),
        sa.Column("trait_text", sa.Text, nullable=False),
    )
    op.create_index(
        "ix_zodiac_trait_template_key_order",
        "zodiac_trait_template",
        ["zodiac_key", "order_index"],
    )

    t = sa.table(
        "zodiac_trait_template",
        sa.column("id", sa.Integer),
        sa.column("zodiac_key", sa.Text),
        sa.column("zodiac_name", sa.Text),
        sa.column("glyph", sa.Text),
        sa.column("order_index", sa.Integer),
        sa.column("trait_text", sa.Text),
    )
    rows = []
    next_id = 1
    for key, name, glyph, traits in ZODIACS:
        for i, trait in enumerate(traits):
            rows.append({
                "id": next_id,
                "zodiac_key": key,
                "zodiac_name": name,
                "glyph": glyph,
                "order_index": i + 1,
                "trait_text": trait,
            })
            next_id += 1
    op.bulk_insert(t, rows)


def downgrade() -> None:
    op.drop_index(
        "ix_zodiac_trait_template_key_order", table_name="zodiac_trait_template"
    )
    op.drop_table("zodiac_trait_template")
