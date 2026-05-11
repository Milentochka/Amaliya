"""Telegram binding code lifecycle: issue, look up, mark used, unbind."""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Guest,
    TelegramBindingCode,
    TelegramBindingCodeOwnerType,
)


CODE_TTL_MINUTES = 15


def _generate_code() -> str:
    """10-char URL-safe code, uppercase for easier in-Telegram copy."""
    raw = secrets.token_urlsafe(10).replace("-", "").replace("_", "")
    return raw[:10].upper()


async def issue_code_for_guest(
    session: AsyncSession, *, guest_id: uuid.UUID
) -> dict:
    # Cancel any previous unused codes for this owner.
    await session.execute(
        delete(TelegramBindingCode).where(
            TelegramBindingCode.owner_type == TelegramBindingCodeOwnerType.GUEST,
            TelegramBindingCode.owner_id == str(guest_id),
            TelegramBindingCode.used.is_(False),
        )
    )
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)
    session.add(
        TelegramBindingCode(
            code=code,
            owner_type=TelegramBindingCodeOwnerType.GUEST,
            owner_id=str(guest_id),
            expires_at=expires_at,
            used=False,
        )
    )
    await session.commit()
    return {"code": code, "expires_at": expires_at.isoformat()}


async def unbind_guest_telegram(
    session: AsyncSession, *, guest_id: uuid.UUID
) -> None:
    await session.execute(
        update(Guest)
        .where(Guest.id == guest_id)
        .values(telegram_id=None, telegram_username=None)
    )
    await session.commit()


async def consume_code(
    session: AsyncSession,
    *,
    code: str,
    telegram_id: int,
    telegram_username: Optional[str],
) -> Optional[Guest]:
    """Look up an unused code, bind the guest's telegram fields, mark used.

    Returns the bound Guest on success, or None if code invalid/expired.
    """
    row = (
        await session.execute(
            select(TelegramBindingCode).where(
                TelegramBindingCode.code == code,
                TelegramBindingCode.used.is_(False),
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return None
    if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    if row.owner_type != TelegramBindingCodeOwnerType.GUEST:
        return None

    guest = (
        await session.execute(
            select(Guest).where(Guest.id == uuid.UUID(row.owner_id))
        )
    ).scalar_one_or_none()
    if guest is None:
        return None

    guest.telegram_id = telegram_id
    guest.telegram_username = telegram_username
    row.used = True
    await session.commit()
    return guest
