"""Admin wishlist CRUD endpoints. Auth via admin cookie."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.auth import MessageOut
from app.schemas.wishlist import (
    WishlistItemAdmin,
    WishlistItemCreateIn,
    WishlistItemUpdateIn,
)
from app.services.wishlist import (
    ItemNotFound,
    admin_create_item,
    admin_delete_item,
    admin_update_item,
    list_items_for_admin,
    resolve_admin_id_from_token,
)

router = APIRouter(prefix="/admin/wishlist", tags=["admin-wishlist"])


async def _require_admin(session: AsyncSession, token: Optional[str]) -> int:
    admin_id = await resolve_admin_id_from_token(session, token)
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован как админ",
        )
    return admin_id


@router.get("/items", response_model=List[WishlistItemAdmin])
async def list_all(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await list_items_for_admin(session)


@router.post("/items", response_model=WishlistItemAdmin, status_code=201)
async def create(
    payload: WishlistItemCreateIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    item = await admin_create_item(session, payload.model_dump())
    items = await list_items_for_admin(session)
    return next(i for i in items if i["id"] == str(item.id))


@router.patch("/items/{item_id}", response_model=WishlistItemAdmin)
async def update(
    item_id: uuid.UUID,
    payload: WishlistItemUpdateIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        item = await admin_update_item(
            session,
            item_id,
            payload.model_dump(exclude_unset=True),
        )
    except ItemNotFound:
        raise HTTPException(status_code=404, detail="Подарок не найден")
    items = await list_items_for_admin(session)
    return next(i for i in items if i["id"] == str(item.id))


@router.delete("/items/{item_id}", response_model=MessageOut)
async def delete(
    item_id: uuid.UUID,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        await admin_delete_item(session, item_id)
    except ItemNotFound:
        raise HTTPException(status_code=404, detail="Подарок не найден")
    return {"message": "deleted"}
