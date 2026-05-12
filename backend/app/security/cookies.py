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
    """In production the frontend (Vercel) lives on a different domain
    than the backend (Railway), so cookies must be SameSite=None+Secure
    to flow on cross-site fetch requests."""
    settings = get_settings()
    is_prod = settings.app_env != "development"
    response.set_cookie(
        key=_cookie_name(owner_type),
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        expires=expires_at,
        path="/",
    )


def clear_session_cookie(response: Response, *, owner_type: str) -> None:
    response.delete_cookie(key=_cookie_name(owner_type), path="/")
