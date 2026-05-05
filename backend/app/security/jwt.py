"""JWT issue/decode for guest and admin sessions."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from jose import JWTError, jwt

from app.config import get_settings


def make_session_token() -> str:
    """Opaque session token (also stored in DB sessions table)."""
    return secrets.token_urlsafe(32)


def issue_jwt(
    *, owner_type: str, owner_id: str, ttl_days: int
) -> Tuple[str, datetime]:
    """Encode a JWT carrying owner_type ('guest'|'admin') and owner_id."""
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)
    payload = {
        "sub": owner_id,
        "ot": owner_type,
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_at


def decode_jwt(token: str) -> Optional[dict]:
    """Decode + verify; returns None on invalid/expired."""
    settings = get_settings()
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except JWTError:
        return None
