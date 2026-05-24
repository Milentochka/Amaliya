"""Projector mode toggle: slideshow vs contests."""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.db.models.projector_settings import ProjectorSettings
from app.services.wishlist import resolve_admin_id_from_token


class ProjectorModeOut(BaseModel):
    contests_enabled: bool
    music_enabled: bool
    music_volume: int  # 0..100


class ProjectorModeIn(BaseModel):
    contests_enabled: Optional[bool] = None
    music_enabled: Optional[bool] = None
    music_volume: Optional[int] = None


async def _get_or_create(session: AsyncSession) -> ProjectorSettings:
    row = (
        await session.execute(select(ProjectorSettings).where(ProjectorSettings.id == 1))
    ).scalar_one_or_none()
    if row is None:
        row = ProjectorSettings(id=1, contests_enabled=False)
        session.add(row)
        await session.commit()
        await session.refresh(row)
    return row


host_router = APIRouter(prefix="/host/projector", tags=["host", "projector"])
projector_router = APIRouter(prefix="/projector/mode", tags=["projector"])


async def _require_admin(session: AsyncSession, token: Optional[str]) -> int:
    admin_id = await resolve_admin_id_from_token(session, token)
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован как админ",
        )
    return admin_id


def _serialize(row) -> dict:
    return {
        "contests_enabled": row.contests_enabled,
        "music_enabled": row.music_enabled,
        "music_volume": row.music_volume,
    }


@projector_router.get("", response_model=ProjectorModeOut)
async def get_mode(session: AsyncSession = Depends(get_session)):
    row = await _get_or_create(session)
    return _serialize(row)


@host_router.get("/mode", response_model=ProjectorModeOut)
async def host_get_mode(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    row = await _get_or_create(session)
    return _serialize(row)


@host_router.put("/mode", response_model=ProjectorModeOut)
async def host_set_mode(
    payload: ProjectorModeIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    row = await _get_or_create(session)
    if payload.contests_enabled is not None:
        row.contests_enabled = payload.contests_enabled
    if payload.music_enabled is not None:
        row.music_enabled = payload.music_enabled
    if payload.music_volume is not None:
        row.music_volume = max(0, min(100, int(payload.music_volume)))
    await session.commit()
    await session.refresh(row)
    return _serialize(row)
