"""CLI: create or update an admin account.

Usage:
    python -m app.cli.seed_admin --role mom --login mama --password 'secret'
    python -m app.cli.seed_admin --role dad --login papa --password 'secret'

Idempotent: re-running with the same role updates the login/password hash.
Avatar is auto-assigned: mom → Котёнок Гав (#49), dad → Бонифаций (#51).
"""

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.db.database import _session_factory
from app.db.models import Admin, AdminRole, Avatar
from app.security.passwords import hash_password


_ROLE_TO_AVATAR_ID = {
    AdminRole.MOM: 49,  # Котёнок Гав
    AdminRole.DAD: 51,  # Бонифаций
}


async def seed_admin(role: AdminRole, login: str, password: str) -> None:
    if _session_factory is None:
        raise SystemExit("DATABASE_URL is not configured")
    async with _session_factory() as session:
        # Avatar must exist (seeded in migration 0001)
        avatar_id = _ROLE_TO_AVATAR_ID[role]
        avatar = (
            await session.execute(select(Avatar).where(Avatar.id == avatar_id))
        ).scalar_one_or_none()
        if avatar is None:
            raise SystemExit(
                f"Avatar #{avatar_id} not found. Run `alembic upgrade head` first."
            )

        existing = (
            await session.execute(select(Admin).where(Admin.role == role))
        ).scalar_one_or_none()

        password_hash = hash_password(password)

        if existing is None:
            session.add(
                Admin(
                    role=role,
                    login=login,
                    password_hash=password_hash,
                    avatar_id=avatar_id,
                )
            )
            print(f"Created admin: role={role.value}, login={login}")
        else:
            existing.login = login
            existing.password_hash = password_hash
            existing.avatar_id = avatar_id
            print(f"Updated admin: role={role.value}, login={login}")

        await session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin account.")
    parser.add_argument("--role", required=True, choices=["mom", "dad"])
    parser.add_argument("--login", required=True, help="login (must be unique)")
    parser.add_argument("--password", required=True, help="plaintext password — will be argon2-hashed")
    args = parser.parse_args()

    asyncio.run(seed_admin(AdminRole(args.role), args.login, args.password))


if __name__ == "__main__":
    main()
