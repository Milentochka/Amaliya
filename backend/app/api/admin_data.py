"""Admin data endpoints: dashboard stats, guests overview, bookings, RSVP edits."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.admin import (
    AdminRsvpUpdateIn,
    BookingAdminOut,
    DashboardStats,
    GuestAdminOut,
)
from app.schemas.auth import MessageOut, RsvpStatusOut
from app.services.admin import (
    BookingNotFound,
    GuestNotFound,
    admin_cancel_booking,
    admin_delete_guest,
    admin_update_guest_rsvp,
    get_dashboard_stats,
    list_bookings,
    list_guests,
)
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
