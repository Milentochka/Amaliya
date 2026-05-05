"""HttpOnly cookie helpers."""

from datetime import datetime

from fastapi import Response

from app.config import get_settings

GUEST_COOKIE = "amaliya_guest_session"
ADMIN_COOKIE = "amaliya_admin_session"


def _cookie_name(owner_type: str) -> str:
    return GUEST_COOKIE if owner_type == "guest" else ADMIN_COOKIE


def set_session_cookie(
    response: Response,
    *,
    token: str,
    expires_at: datetime,
    owner_type: str,
) -> None:
    settings = get_settings()
    response.set_cookie(
        key=_cookie_name(owner_type),
        value=token,
        httponly=True,
        secure=settings.app_env != "development",
        samesite="lax",
        expires=expires_at,
        path="/",
    )


def clear_session_cookie(response: Response, *, owner_type: str) -> None:
    response.delete_cookie(key=_cookie_name(owner_type), path="/")
