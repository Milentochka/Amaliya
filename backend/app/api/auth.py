"""Guest auth endpoints: register/login (single form), logout, me."""

import uuid
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_session
from app.schemas.auth import (
    GuestLookupIn,
    GuestRegisterIn,
    GuestRegisterOut,
    MessageOut,
    TelegramBindCodeOut,
)
from app.security.cookies import GUEST_COOKIE, clear_session_cookie, set_session_cookie
from app.services.auth import (
    AvatarsExhausted,
    login_or_register_guest,
    logout as svc_logout,
    lookup_existing_guest,
    resolve_guest_from_token,
)
from app.services.telegram_bind import (
    issue_code_for_guest,
    unbind_guest_telegram,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/lookup",
    response_model=GuestRegisterOut,
    status_code=status.HTTP_200_OK,
)
async def lookup(
    payload: GuestLookupIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    """Step 1: only Name + DOB. Returns 200 + login on match, 404 on miss."""
    result = await lookup_existing_guest(
        session, name=payload.name, birth_date_str=payload.birth_date
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="not_registered"
        )
    response_data, token, expires_at = result
    set_session_cookie(
        response, token=token, expires_at=expires_at, owner_type="guest"
    )
    return response_data


@router.post(
    "/login-or-register",
    response_model=GuestRegisterOut,
    status_code=status.HTTP_200_OK,
)
async def login_or_register(
    payload: GuestRegisterIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    try:
        result, token, expires_at = await login_or_register_guest(session, payload)
    except AvatarsExhausted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Все слоты аватаров заняты. Обратитесь к администратору.",
        )
    set_session_cookie(
        response, token=token, expires_at=expires_at, owner_type="guest"
    )
    return result


@router.post("/logout", response_model=MessageOut)
async def logout(
    response: Response,
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    if amaliya_guest_session:
        await svc_logout(session, amaliya_guest_session)
    clear_session_cookie(response, owner_type="guest")
    return {"message": "logged out"}


@router.get("/me")
async def me(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest = await resolve_guest_from_token(session, amaliya_guest_session)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
        )
    return {"guest": guest}


@router.post("/me/telegram/start-bind", response_model=TelegramBindCodeOut)
async def telegram_start_bind(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    """Generate a one-time code for Telegram binding. Show to guest along
    with the bot username; guest opens t.me/<bot>?start=<code>."""
    guest = await resolve_guest_from_token(session, amaliya_guest_session)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован"
        )
    issued = await issue_code_for_guest(
        session, guest_id=uuid.UUID(guest["id"])
    )
    settings = get_settings()
    return {
        "code": issued["code"],
        "bot_username": settings.telegram_bot_username,
        "expires_at": issued["expires_at"],
    }


@router.post("/me/telegram/unbind", response_model=MessageOut)
async def telegram_unbind(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest = await resolve_guest_from_token(session, amaliya_guest_session)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован"
        )
    await unbind_guest_telegram(session, guest_id=uuid.UUID(guest["id"]))
    return {"message": "unbound"}


# Trick: tell FastAPI which cookie name we read so OpenAPI shows it.
# (Cookie param names with hyphens get converted from underscores.)
del GUEST_COOKIE  # placate linter; actual cookie name set in cookies.py
