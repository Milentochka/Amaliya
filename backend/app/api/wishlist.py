"""Guest-facing wishlist endpoints."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.auth import MessageOut
from app.schemas.wishlist import BookItemIn, MyBookingOut, WishlistItemPublic
from app.services.auth import resolve_guest_from_token
from app.services.wishlist import (
    BookingNotFound,
    ItemAlreadyBooked,
    ItemNotFound,
    NotYourBooking,
    book_item,
    cancel_my_booking,
    list_items_for_guest,
    list_my_bookings,
)

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


async def _require_guest(
    session: AsyncSession, token: Optional[str]
) -> uuid.UUID:
    guest = await resolve_guest_from_token(session, token)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован"
        )
    return uuid.UUID(guest["id"])


@router.get("", response_model=List[WishlistItemPublic])
async def list_items(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest_id = await _require_guest(session, amaliya_guest_session)
    return await list_items_for_guest(session, viewer_guest_id=guest_id)


@router.post("/items/{item_id}/book", response_model=WishlistItemPublic)
async def book(
    item_id: uuid.UUID,
    payload: BookItemIn,
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest_id = await _require_guest(session, amaliya_guest_session)
    try:
        booking, item, _guest = await book_item(
            session, item_id=item_id, guest_id=guest_id, comment=payload.comment
        )
    except ItemNotFound:
        raise HTTPException(status_code=404, detail="Подарок не найден")
    except ItemAlreadyBooked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот подарок уже забронирован",
        )
    # Refetch the item with all bookings so we return up-to-date status
    items = await list_items_for_guest(session, viewer_guest_id=guest_id)
    found = next((i for i in items if i["id"] == str(item.id)), None)
    return found


@router.delete("/bookings/{booking_id}", response_model=MessageOut)
async def cancel_booking(
    booking_id: uuid.UUID,
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest_id = await _require_guest(session, amaliya_guest_session)
    try:
        await cancel_my_booking(session, booking_id=booking_id, guest_id=guest_id)
    except BookingNotFound:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    except NotYourBooking:
        raise HTTPException(status_code=403, detail="Это не Ваша бронь")
    return {"message": "cancelled"}


@router.get("/my-bookings", response_model=List[MyBookingOut])
async def my_bookings(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest_id = await _require_guest(session, amaliya_guest_session)
    return await list_my_bookings(session, guest_id=guest_id)
