"""Family media — host upload/manage + projector public list."""

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.auth import MessageOut
from app.schemas.family_media import FamilyMediaOut, FamilyMediaReorderIn
from app.services.family_media import (
    add_media,
    delete_media,
    list_media,
    reorder_media,
)
from app.services.wishlist import resolve_admin_id_from_token

MAX_BYTES = 100 * 1024 * 1024  # 100 MB per file

host_router = APIRouter(prefix="/host/media", tags=["host", "media"])
projector_router = APIRouter(prefix="/projector/media", tags=["projector", "media"])


async def _require_admin(session: AsyncSession, token: Optional[str]) -> int:
    admin_id = await resolve_admin_id_from_token(session, token)
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован как админ",
        )
    return admin_id


@host_router.get("", response_model=List[FamilyMediaOut])
async def host_list(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await list_media(session)


@host_router.post("", response_model=FamilyMediaOut)
async def host_upload(
    file: UploadFile = File(...),
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Файл слишком большой (макс. 100 МБ)")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Файл пустой")
    try:
        return await add_media(
            session,
            original_filename=file.filename or "upload",
            content=content,
        )
    except ValueError as e:
        if str(e) == "unsupported_file_type":
            raise HTTPException(
                status_code=400,
                detail="Только jpg/png/heic/webp/gif/mp4/mov/webm/m4v",
            )
        raise


@host_router.delete("/{media_id}", response_model=MessageOut)
async def host_delete(
    media_id: int,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    ok = await delete_media(session, media_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Не найдено")
    return {"message": "deleted"}


@host_router.put("/order", response_model=List[FamilyMediaOut])
async def host_reorder(
    payload: FamilyMediaReorderIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await reorder_media(session, payload.ids)


@projector_router.get("", response_model=List[FamilyMediaOut])
async def projector_list(session: AsyncSession = Depends(get_session)):
    return await list_media(session)
