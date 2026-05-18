"""Admin data endpoints: dashboard stats, guests overview, bookings, RSVP edits."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.admin import (
    AdminGuestCreateIn,
    AdminGuestUpdateIn,
    AdminRsvpUpdateIn,
    AvatarShort,
    BookingAdminOut,
    DashboardStats,
    GamePlayerOut,
    GuestAdminOut,
)
from app.schemas.auth import MessageOut, RsvpStatusOut
from app.services.admin import (
    BookingNotFound,
    GuestAlreadyExists,
    GuestNotFound,
    admin_cancel_booking,
    admin_create_guest,
    admin_delete_guest,
    admin_update_guest,
    admin_update_guest_rsvp,
    get_dashboard_stats,
    list_avatars,
    list_bookings,
    list_game_players,
    list_guests,
)
from app.services.auth import AvatarsExhausted
from app.services.wishlist import resolve_admin_id_from_token

router = APIRouter(prefix="/admin", tags=["admin-data"])


async def _require_admin(session: AsyncSession, token: Optional[str]) -> int:
    admin_id = await resolve_admin_id_from_token(session, token)
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован как админ",
        )
    return admin_id


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await get_dashboard_stats(session)


@router.get("/guests", response_model=List[GuestAdminOut])
async def guests(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await list_guests(session)


@router.post("/guests", response_model=GuestAdminOut, status_code=201)
async def create_guest(
    payload: AdminGuestCreateIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await admin_create_guest(
            session,
            name=payload.name,
            birth_date_str=payload.birth_date,
            gender=payload.gender,
            rsvp_christening=payload.rsvp_christening,
            rsvp_banquet=payload.rsvp_banquet,
        )
    except GuestAlreadyExists:
        raise HTTPException(status_code=409, detail="Гость с таким именем и ДР уже есть")
    except AvatarsExhausted:
        raise HTTPException(status_code=409, detail="Все аватары заняты")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/avatars", response_model=List[AvatarShort])
async def avatars(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await list_avatars(session)


@router.patch("/guests/{guest_id}", response_model=GuestAdminOut)
async def update_guest(
    guest_id: uuid.UUID,
    payload: AdminGuestUpdateIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await admin_update_guest(
            session,
            guest_id=guest_id,
            name=payload.name,
            birth_date_str=payload.birth_date,
            gender=payload.gender,
            avatar_id=payload.avatar_id,
            unbind_telegram=payload.unbind_telegram,
        )
    except GuestNotFound:
        raise HTTPException(status_code=404, detail="Гость не найден")
    except ValueError as e:
        msg = str(e)
        labels = {
            "avatar_not_found": "Такой аватар не существует",
            "avatar_reserved_for_admin": "Этот аватар закреплён за админом",
            "avatar_taken": "Этот аватар уже занят другим гостем",
        }
        raise HTTPException(status_code=400, detail=labels.get(msg, msg))


@router.patch("/guests/{guest_id}/rsvp", response_model=RsvpStatusOut)
async def update_guest_rsvp(
    guest_id: uuid.UUID,
    payload: AdminRsvpUpdateIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await admin_update_guest_rsvp(
            session,
            guest_id=guest_id,
            christening=payload.christening,
            banquet=payload.banquet,
        )
    except GuestNotFound:
        raise HTTPException(status_code=404, detail="Гость не найден")


@router.delete("/guests/{guest_id}", response_model=MessageOut)
async def delete_guest(
    guest_id: uuid.UUID,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        await admin_delete_guest(session, guest_id=guest_id)
    except GuestNotFound:
        raise HTTPException(status_code=404, detail="Гость не найден")
    return {"message": "deleted"}


@router.get("/bookings", response_model=List[BookingAdminOut])
async def bookings(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await list_bookings(session)


@router.delete("/bookings/{booking_id}", response_model=MessageOut)
async def cancel_booking(
    booking_id: uuid.UUID,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        await admin_cancel_booking(session, booking_id=booking_id)
    except BookingNotFound:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    return {"message": "cancelled"}


@router.get("/game", response_model=List[GamePlayerOut])
async def game_players(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await list_game_players(session)


@router.get("/me", response_model=dict)
async def admin_me(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    """Tells the frontend layout whether the admin cookie is valid."""
    admin_id = await resolve_admin_id_from_token(session, amaliya_admin_session)
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован"
        )
    return {"admin_id": admin_id}
