"""Initial schema for Module 1 (auth + avatars + sessions + telegram bindings).

Creates the tables and seeds the 51-avatar catalog from docs/avatars-final.md.
Avatars #49 (Котёнок Гав) and #51 (Бонифаций) are flagged reserved_for_admin.

Revision ID: 0001_initial_module1
Revises:
Create Date: 2026-05-06
"""
from __future__ import annotations

from collections.abc import Sequence
from typing import List, Tuple

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_module1"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Reusable enum instances. Each is created once via .create(); referenced
# from columns by the same Python object so SA does not re-emit CREATE TYPE.
admin_role_enum = postgresql.ENUM("mom", "dad", name="admin_role", create_type=False)
guest_gender_enum = postgresql.ENUM("M", "F", name="guest_gender", create_type=False)
session_owner_enum = postgresql.ENUM(
    "guest", "admin", name="session_owner_type", create_type=False
)
tg_binding_owner_enum = postgresql.ENUM(
    "guest", "admin", name="tg_binding_owner_type", create_type=False
)


# (id, name, image_url, reserved_for_admin)
AVATARS: List[Tuple[int, str, str, bool]] = [
    (1, "Иван-царевич", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-sfqp-p-kartinki-ivan-na-prozrachnom-fone-5.png", False),
    (2, "Василиса Премудрая", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-jl0j-p-kartinki-vasilisa-premudraya-na-prozrachno-18.png", False),
    (3, "Баба-Яга", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-g0wx-p-kartinki-baba-yaga-na-prozrachnom-fone-6.png", False),
    (4, "Кощей Бессмертный", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-3dc9-p-kartinki-koshchei-bessmertnii-na-prozrachn-7.png", False),
    (5, "Жар-птица", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-g4hz-p-kartinki-zhar-ptitsa-na-prozrachnom-fone-7.png", False),
    (6, "Серый Волк", "https://png.klev.club/uploads/posts/2024-06/png-klev-club-ievp-p-ivan-tsarevich-i-serii-volk-png-5.png", False),
    (7, "Колобок", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-2tbs-p-kartinki-kolobok-na-prozrachnom-fone-2.png", False),
    (8, "Конёк-Горбунок", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-whgg-p-kartinki-konek-gorbunok-na-prozrachnom-fon-1.png", False),
    (9, "Алёнушка", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-d5hm-p-kartinki-alenushka-na-prozrachnom-fone-6.png", False),
    (10, "Братец Иванушка", "https://kartinkof.club/uploads/posts/2023-05/1683410757_kartinkof-club-p-kartinki-ivanushka-4.png", False),
    (11, "Лиса Патрикеевна", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-gwab-p-kartinki-lisa-iz-kolobka-na-prozrachnom-fo-9.png", False),
    (12, "Курочка Ряба", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-djo3-p-kartinki-kurochka-ryaba-na-prozrachnom-fon-5.png", False),
    (13, "Дядя Фёдор", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-5lab-p-kartinki-dyadya-fedor-iz-prostokvashino-na-7.png", False),
    (14, "Кот Матроскин", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-w9df-p-kartinki-kot-matroskin-na-prozrachnom-fone-1.png", False),
    (15, "Пёс Шарик", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-ullq-p-kartinki-sharik-prostokvashino-na-prozrach-3.png", False),
    (16, "Почтальон Печкин", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-ucp3-p-kartinki-pochtalon-pechkin-na-prozrachnom-9.png", False),
    (17, "Чебурашка", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-x6zn-p-kartinki-cheburashka-na-prozrachnom-fone-9.png", False),
    (18, "Крокодил Гена", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-g46s-p-kartinki-krokodil-gena-na-prozrachnom-fone-24.png", False),
    (19, "Старуха Шапокляк", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-4itf-p-kartinki-shapoklyak-na-prozrachnom-fone-10.png", False),
    (20, "Винни-Пух", "https://png.klev.club/uploads/posts/2024-04/png-klev-club-m1rk-p-sovetskii-vinni-pukh-png-2.png", False),
    (21, "Пятачок", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-rdao-p-kartinki-pyatachok-na-prozrachnom-fone-13.png", False),
    (22, "Иа-Иа", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-stwj-p-kartinki-oslik-ia-na-prozrachnom-fone-17.png", False),
    (23, "Сова", "https://kartinki.pics/uploads/posts/2022-02/1645179799_2-kartinkin-net-p-sova-iz-vinni-pukha-kartinki-2.png", False),
    (24, "Карлсон", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-l97d-p-kartinki-karlson-na-prozrachnom-fone-3.png", False),
    (25, "Малыш", "https://png.klev.club/uploads/posts/2024-06/png-klev-club-944e-p-malish-i-karlson-png-13.png", False),
    (26, "Фрекен Бок", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-h3yc-p-kartinki-freken-bok-na-prozrachnom-fone-27.png", False),
    (27, "Волк (Ну, погоди!)", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-byos-p-kartinki-volk-iz-nu-pogodi-na-prozrachnom-25.png", False),
    (28, "Заяц (Ну, погоди!)", "https://png.klev.club/uploads/posts/2024-04/png-klev-club-ya49-p-nu-pogodi-png-21.png", False),
    (29, "Мартышка", "https://i.pinimg.com/1200x/4e/3e/9b/4e3e9b76769a92e97e3a0ba1cbaeb10a.jpg", False),
    (30, "Удав", "https://licensingrussia.ru/media/cache/98/69/98698854e7c6d37ff7ec206808a2e977.jpg", False),
    (31, "Слонёнок", "https://kulturologia.ru/files/u19001/Thirty-eight-parrots-4.jpg", False),
    (32, "Попугай", "https://i.pinimg.com/736x/43/5a/a0/435aa091175b64ffc8ca60196f91ad23.jpg", False),
    (33, "Водяной", "https://kartinki.pibig.info/uploads/posts/2023-04/1681319805_kartinki-pibig-info-p-vodyanoi-letuchii-korabl-kartinki-iz-multi-14.jpg", False),
    (34, "Бабки-Ёжки", "https://static.kinoafisha.info/upload/articles/740012355597.jpg", False),
    (35, "Кот Леопольд", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-jo2m-p-kartinki-kot-leopold-na-prozrachnom-fone-4.png", False),
    (36, "Чиполлино", "https://foni.papik.pro/uploads/posts/2024-10/foni-papik-pro-5p9h-p-kartinki-chipollino-na-prozrachnom-fone-9.png", False),
    (37, "Незнайка", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-4ibs-p-kartinki-neznaika-na-prozrachnom-fone-4.png", False),
    (38, "Львёнок", "https://kartinki.pibig.info/uploads/posts/2023-04/1681562292_kartinki-pibig-info-p-kartinki-iz-multika-lvenok-i-cherepakha-ar-7.png", False),
    (39, "Большая Черепаха", "https://kartinki.pibig.info/uploads/posts/2023-04/1681562327_kartinki-pibig-info-p-kartinki-iz-multika-lvenok-i-cherepakha-ar-75.jpg", False),
    (40, "Ёжик", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-419f-p-kartinki-yezhik-v-tumane-na-prozrachnom-fo-27.png", False),
    (41, "Медвежонок", "https://i.pinimg.com/474x/bd/f8/a6/bdf8a6a75576aba23e124b026817fb2d.jpg", False),
    (42, "Маугли", "https://kartinki.pibig.info/uploads/posts/2023-04/1681673626_kartinki-pibig-info-p-maugli-kartinki-iz-multfilma-arti-pinteres-4.jpg", False),
    (43, "Багира", "https://papik.pro/uploads/posts/2023-02/1675991627_papik-pro-p-risunok-bagira-2.jpg", False),
    (44, "Трубадур", "https://slovnet.ru/wp-content/uploads/2019/03/1-1.jpg", False),
    (45, "Принцесса (Бременские музыканты)", "https://slovnet.ru/wp-content/uploads/2019/03/2-5.jpg", False),
    (46, "Буратино", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-cbw0-p-kartinki-buratino-na-prozrachnom-fone-9.png", False),
    (47, "Мальвина", "https://foni.papik.pro/uploads/posts/2024-09/foni-papik-pro-2c4r-p-kartinki-malvina-na-prozrachnom-fone-1.png", False),
    (48, "Мамонтёнок", "https://png.klev.club/uploads/posts/2024-04/png-klev-club-zh7y-p-mamontenok-png-3.png", False),
    (49, "Котёнок по имени Гав", "https://papik.pro/izobr/uploads/posts/2023-02/1677281856_papik-pro-p-illyustratsiya-k-multfilmu-kotenok-gav-6.jpg", True),
    (50, "Умка", "https://kartinki.pibig.info/uploads/posts/2023-04/1681952630_kartinki-pibig-info-p-kartinki-iz-multfilma-umka-arti-pinterest-1.jpg", False),
    (51, "Бонифаций", "https://memax.club/wp-content/uploads/2019/06/Kartinki_lev_Bonifaciy_1_09050039.jpg", True),
]


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Create all enum types up front via raw SQL — idempotent, predictable.
    op.execute("CREATE TYPE admin_role AS ENUM ('mom', 'dad')")
    op.execute("CREATE TYPE guest_gender AS ENUM ('M', 'F')")
    op.execute("CREATE TYPE session_owner_type AS ENUM ('guest', 'admin')")
    op.execute("CREATE TYPE tg_binding_owner_type AS ENUM ('guest', 'admin')")

    # 2. avatars (no enums, but referenced by FKs from admin/guests)
    op.create_table(
        "avatars",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("image_url", sa.Text, nullable=False),
        sa.Column("is_taken", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("reserved_for_admin", sa.Boolean, server_default=sa.text("false"), nullable=False),
    )
    avatars_table = sa.table(
        "avatars",
        sa.column("id", sa.Integer),
        sa.column("name", sa.Text),
        sa.column("image_url", sa.Text),
        sa.column("is_taken", sa.Boolean),
        sa.column("reserved_for_admin", sa.Boolean),
    )
    op.bulk_insert(
        avatars_table,
        [
            {
                "id": id_,
                "name": name,
                "image_url": url,
                "is_taken": False,
                "reserved_for_admin": reserved,
            }
            for id_, name, url, reserved in AVATARS
        ],
    )

    # 3. admin
    op.create_table(
        "admin",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("role", admin_role_enum, unique=True, nullable=False),
        sa.Column("login", sa.Text, unique=True, nullable=False),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("avatar_id", sa.Integer, sa.ForeignKey("avatars.id"), nullable=True),
        sa.Column("telegram_id", sa.BigInteger, nullable=True),
        sa.Column("telegram_username", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 4. guests
    op.create_table(
        "guests",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("birth_date", sa.Date, nullable=False),
        sa.Column("gender", guest_gender_enum, nullable=False),
        sa.Column("avatar_id", sa.Integer, sa.ForeignKey("avatars.id"), nullable=False),
        sa.Column("telegram_id", sa.BigInteger, unique=True, nullable=True),
        sa.Column("telegram_username", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("name", "birth_date", name="uq_guest_name_birth_date"),
    )

    # 5. sessions
    op.create_table(
        "sessions",
        sa.Column("token", sa.Text, primary_key=True),
        sa.Column("owner_type", session_owner_enum, nullable=False),
        sa.Column("owner_id", sa.Text, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 6. telegram_binding_codes
    op.create_table(
        "telegram_binding_codes",
        sa.Column("code", sa.Text, primary_key=True),
        sa.Column("owner_type", tg_binding_owner_enum, nullable=False),
        sa.Column("owner_id", sa.Text, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("telegram_binding_codes")
    op.drop_table("sessions")
    op.drop_table("guests")
    op.drop_table("admin")
    op.drop_table("avatars")
    op.execute("DROP TYPE IF EXISTS tg_binding_owner_type")
    op.execute("DROP TYPE IF EXISTS session_owner_type")
    op.execute("DROP TYPE IF EXISTS guest_gender")
    op.execute("DROP TYPE IF EXISTS admin_role")
