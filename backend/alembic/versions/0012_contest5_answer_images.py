"""Contest 5: add answer_image_key column + seed image keys.

Revision ID: 0012_contest5_answer_images
Revises: 0011_contest5
Create Date: 2026-05-19
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012_contest5_answer_images"
down_revision: str | None = "0011_contest5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contest5_question",
        sa.Column("answer_image_key", sa.Text, nullable=True),
    )

    # Image keys are file basenames in app/contests/contest5/. Renderer
    # adds the extension dynamically.
    updates = [
        # (category_id, value, image_key, answer_image_key)
        # Armenia — question images (contextual)
        (1, 200, "armenia_200", None),
        (1, 300, "armenia_300", None),
        (1, 500, "armenia_500", None),
        # Cartoons — original images stay on question, new ones go to answer
        (4, 100, None,           "ans_cartoons_100"),
        (4, 200, None,           "ans_cartoons_200"),
        (4, 300, "cartoons_300", None),
        (4, 400, "cartoons_400", None),
        (4, 500, None,           "ans_cartoons_500"),
        # Tales — all images go to answer
        (5, 100, None, "ans_tales_100"),
        (5, 200, None, "ans_tales_200"),
        (5, 300, None, "ans_tales_300"),
        (5, 400, None, "ans_tales_400"),
        (5, 500, None, "ans_tales_500"),
    ]
    conn = op.get_bind()
    for cat, val, img, ans_img in updates:
        conn.execute(
            sa.text(
                "UPDATE contest5_question SET image_key = :img, "
                "answer_image_key = :ans_img "
                "WHERE category_id = :cat AND value = :val"
            ),
            {"img": img, "ans_img": ans_img, "cat": cat, "val": val},
        )


def downgrade() -> None:
    op.drop_column("contest5_question", "answer_image_key")
