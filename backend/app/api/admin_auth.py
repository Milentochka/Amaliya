"""Admin login endpoint."""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.auth import AdminLoginIn, AdminOut, MessageOut
from app.security.cookies import clear_session_cookie, set_session_cookie
from app.services.auth import (
    AdminCredentialsInvalid,
    admin_login,
    logout as svc_logout,
)

router = APIRouter(prefix="/admin", tags=["admin-auth"])


@router.post("/login", response_model=AdminOut)
async def login(
    payload: AdminLoginIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    try:
        admin, token, expires_at = await admin_login(
            session, login=payload.login, password=payload.password
        )
    except AdminCredentialsInvalid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные логин или пароль",
        )
    set_session_cookie(
        response, token=token, expires_at=expires_at, owner_type="admin"
    )
    return {
        "id": admin.id,
        "role": admin.role.value if hasattr(admin.role, "value") else admin.role,
        "login": admin.login,
    }


@router.post("/logout", response_model=MessageOut)
async def logout(
    response: Response,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    if amaliya_admin_session:
        await svc_logout(session, amaliya_admin_session)
    clear_session_cookie(response, owner_type="admin")
    return {"message": "logged out"}
