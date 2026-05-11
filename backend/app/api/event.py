"""Public event-info endpoints. Auth: any logged-in guest."""

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.event import EventOut, GuestPublicOut
from app.services.auth import resolve_guest_from_token
from app.services.event import get_event, list_public_guests

router = APIRouter(prefix="/event", tags=["event"])


async def _require_guest(session: AsyncSession, token: Optional[str]) -> None:
    guest = await resolve_guest_from_token(session, token)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован"
        )


@router.get("", response_model=EventOut)
async def event(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_guest(session, amaliya_guest_session)
    return await get_event(session)


@router.get("/guests", response_model=List[GuestPublicOut])
async def guests(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_guest(session, amaliya_guest_session)
    return await list_public_guests(session)
