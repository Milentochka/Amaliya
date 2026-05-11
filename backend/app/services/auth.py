"""Guest registration/login + admin login services."""

import uuid
from datetime import date as Date, datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import (
    Admin,
    Avatar,
    EventPartType,
    Guest,
    Rsvp,
    RsvpStatus,
    Session as DbSession,
    SessionOwnerType,
)
from app.schemas.auth import GuestRegisterIn, parse_dd_mm_yy
from app.security.jwt import issue_jwt
from app.security.passwords import verify_password
from app.services.zodiac import chinese_zodiac, western_zodiac


# -------- Errors --------


class AvatarsExhausted(Exception):
    """Raised when no free non-reserved avatar remains."""


class AdminCredentialsInvalid(Exception):
    pass


# -------- Helpers --------


async def _pick_random_free_avatar(session: AsyncSession) -> Avatar:
    stmt = (
        select(Avatar)
        .where(Avatar.is_taken.is_(False), Avatar.reserved_for_admin.is_(False))
        .order_by(Avatar.id)
        .limit(1)
    )
    avatar = (await session.execute(stmt)).scalar_one_or_none()
    if avatar is None:
        raise AvatarsExhausted()
    avatar.is_taken = True
    return avatar


async def _create_session_record(
    session: AsyncSession, *, owner_type: SessionOwnerType, owner_id: str
) -> Tuple[str, datetime]:
    settings = get_settings()
    ttl = (
        settings.jwt_guest_ttl_days
        if owner_type == SessionOwnerType.GUEST
        else settings.jwt_admin_ttl_days
    )
    token, expires_at = issue_jwt(
        owner_type=owner_type.value, owner_id=owner_id, ttl_days=ttl
    )
    session.add(
        DbSession(
            token=token,
            owner_type=owner_type,
            owner_id=owner_id,
            expires_at=expires_at,
        )
    )
    return token, expires_at


def _serialize_guest(guest: Guest, avatar: Avatar) -> dict:
    return {
        "id": str(guest.id),
        "name": guest.name,
        "birth_date": guest.birth_date.isoformat(),
        "gender": guest.gender.value if hasattr(guest.gender, "value") else guest.gender,
        "avatar": {
            "id": avatar.id,
            "name": avatar.name,
            "image_url": avatar.image_url,
        },
        "zodiac": western_zodiac(guest.birth_date),
        "chinese_zodiac": chinese_zodiac(guest.birth_date),
        "has_telegram": guest.telegram_id is not None,
        "telegram_username": guest.telegram_username,
    }


async def _find_existing(
    session: AsyncSession, name: str, bd: Date
) -> Optional[Guest]:
    return (
        await session.execute(
            select(Guest).where(Guest.name == name, Guest.birth_date == bd)
        )
    ).scalar_one_or_none()


async def _login_to_existing(
    session: AsyncSession, guest: Guest
) -> Tuple[dict, str, datetime]:
    avatar = (
        await session.execute(select(Avatar).where(Avatar.id == guest.avatar_id))
    ).scalar_one()
    rsvp_rows = (
        await session.execute(select(Rsvp).where(Rsvp.guest_id == guest.id))
    ).scalars().all()
    rsvp_dict = {
        row.event_part_type.value: row.status.value for row in rsvp_rows
    }
    token, expires_at = await _create_session_record(
        session, owner_type=SessionOwnerType.GUEST, owner_id=str(guest.id)
    )
    await session.commit()
    return (
        {"guest": _serialize_guest(guest, avatar), "rsvp": rsvp_dict},
        token,
        expires_at,
    )


# -------- Public service functions --------


async def lookup_existing_guest(
    session: AsyncSession, *, name: str, birth_date_str: str
) -> Optional[Tuple[dict, str, datetime]]:
    """Step 1 of two-step flow: find pair (name, dob); login if exists, else None."""
    bd = parse_dd_mm_yy(birth_date_str)
    existing = await _find_existing(session, name, bd)
    if existing is None:
        return None
    return await _login_to_existing(session, existing)


async def login_or_register_guest(
    session: AsyncSession, payload: GuestRegisterIn
) -> Tuple[dict, str, datetime]:
    """If (name, birth_date) exists → log in; else create + assign avatar + 2 RSVPs."""
    bd = parse_dd_mm_yy(payload.birth_date)
    existing = await _find_existing(session, payload.name, bd)
    if existing is not None:
        return await _login_to_existing(session, existing)

    avatar = await _pick_random_free_avatar(session)
    new_guest = Guest(
        id=uuid.uuid4(),
        name=payload.name,
        birth_date=bd,
        gender=payload.gender,
        avatar_id=avatar.id,
    )
    session.add(new_guest)
    session.add(
        Rsvp(
            guest_id=new_guest.id,
            event_part_type=EventPartType.CHRISTENING,
            status=RsvpStatus(payload.rsvp_christening),
        )
    )
    session.add(
        Rsvp(
            guest_id=new_guest.id,
            event_part_type=EventPartType.BANQUET,
            status=RsvpStatus(payload.rsvp_banquet),
        )
    )
    token, expires_at = await _create_session_record(
        session, owner_type=SessionOwnerType.GUEST, owner_id=str(new_guest.id)
    )
    await session.commit()

    return (
        {
            "guest": _serialize_guest(new_guest, avatar),
            "rsvp": {
                "christening": payload.rsvp_christening,
                "banquet": payload.rsvp_banquet,
            },
        },
        token,
        expires_at,
    )


# -------- Admin login --------


async def admin_login(
    session: AsyncSession, *, login: str, password: str
) -> Tuple[Admin, str, datetime]:
    admin = (
        await session.execute(select(Admin).where(Admin.login == login))
    ).scalar_one_or_none()
    if admin is None or not verify_password(password, admin.password_hash):
        raise AdminCredentialsInvalid()
    token, expires_at = await _create_session_record(
        session, owner_type=SessionOwnerType.ADMIN, owner_id=str(admin.id)
    )
    await session.commit()
    return admin, token, expires_at


# -------- Logout --------


async def logout(session: AsyncSession, token: str) -> None:
    db_session = (
        await session.execute(select(DbSession).where(DbSession.token == token))
    ).scalar_one_or_none()
    if db_session is not None:
        await session.delete(db_session)
        await session.commit()


# -------- Resolve current guest from cookie --------


async def resolve_guest_from_token(
    session: AsyncSession, token: Optional[str]
) -> Optional[dict]:
    if not token:
        return None
    db_session = (
        await session.execute(select(DbSession).where(DbSession.token == token))
    ).scalar_one_or_none()
    if db_session is None:
        return None
    if db_session.owner_type != SessionOwnerType.GUEST:
        return None
    if db_session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    guest = (
        await session.execute(
            select(Guest).where(Guest.id == uuid.UUID(db_session.owner_id))
        )
    ).scalar_one_or_none()
    if guest is None:
        return None
    avatar = (
        await session.execute(select(Avatar).where(Avatar.id == guest.avatar_id))
    ).scalar_one()
    return _serialize_guest(guest, avatar)
