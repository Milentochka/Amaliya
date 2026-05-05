"""Guest auth endpoints: register/login (single form), logout, me."""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.auth import GuestRegisterIn, GuestRegisterOut, MessageOut
from app.security.cookies import GUEST_COOKIE, clear_session_cookie, set_session_cookie
from app.services.auth import (
    AvatarsExhausted,
    login_or_register_guest,
    logout as svc_logout,
    resolve_guest_from_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


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
            detail="Все слоты аватаров заняты. Обратись к админу.",
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


# Trick: tell FastAPI which cookie name we read so OpenAPI shows it.
# (Cookie param names with hyphens get converted from underscores.)
del GUEST_COOKIE  # placate linter; actual cookie name set in cookies.py
