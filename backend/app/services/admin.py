"""Admin data services: aggregate stats, guests overview, bookings, RSVP edits."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Avatar,
    Booking,
    EventPartType,
    GameAttempt,
    Guest,
    Rsvp,
    RsvpStatus,
    WishlistItem,
)


# -------- Errors --------


class GuestNotFound(Exception):
    pass


class BookingNotFound(Exception):
    pass


# -------- Stats --------


async def get_dashboard_stats(session: AsyncSession) -> dict:
    guests_total = (
        await session.execute(select(func.count(Guest.id)))
    ).scalar_one()

    rsvp_rows = (await session.execute(select(Rsvp))).scalars().all()
    counts = {
        "christening": {"coming": 0, "not_coming": 0, "maybe": 0},
        "banquet": {"coming": 0, "not_coming": 0, "maybe": 0},
    }
    for r in rsvp_rows:
        part = r.event_part_type.value
        status = r.status.value
        counts[part][status] += 1

    wishlist_total = (
        await session.execute(select(func.count(WishlistItem.id)))
    ).scalar_one()
    bookings = (await session.execute(select(Booking))).scalars().all()
    booked_item_ids = {b.item_id for b in bookings}
    wishlist_booked = len(booked_item_ids)
    wishlist_free = wishlist_total - wishlist_booked

    items_by_id = {
        i.id: i
        for i in (await session.execute(select(WishlistItem))).scalars().all()
    }
    bookings_sum_rub = sum(
        (items_by_id[b.item_id].price_rub or 0)
        for b in bookings
        if b.item_id in items_by_id
    )

    game_attempts = (
        await session.execute(select(func.count(GameAttempt.id)))
    ).scalar_one()
    game_players = (
        await session.execute(
            select(func.count(func.distinct(GameAttempt.guest_id)))
        )
    ).scalar_one()

    return {
        "guests_total": int(guests_total),
        "christening": counts["christening"],
        "banquet": counts["banquet"],
        "wishlist_total": int(wishlist_total),
        "wishlist_booked": int(wishlist_booked),
        "wishlist_free": int(wishlist_free),
        "bookings_total": len(bookings),
        "bookings_sum_rub": int(bookings_sum_rub),
        "game_players": int(game_players),
        "game_attempts": int(game_attempts),
    }


# -------- Guests --------


async def list_guests(session: AsyncSession) -> List[dict]:
    guests = (
        await session.execute(
            select(Guest, Avatar)
            .join(Avatar, Avatar.id == Guest.avatar_id)
            .order_by(Guest.created_at)
        )
    ).all()

    rsvp_rows = (await session.execute(select(Rsvp))).scalars().all()
    rsvp_by_guest: dict = {}
    for r in rsvp_rows:
        d = rsvp_by_guest.setdefault(
            r.guest_id, {"christening": "maybe", "banquet": "maybe"}
        )
        d[r.event_part_type.value] = r.status.value

    bookings = (await session.execute(select(Booking))).scalars().all()
    bookings_per_guest: dict = {}
    last_booking: dict = {}
    for b in bookings:
        bookings_per_guest[b.guest_id] = bookings_per_guest.get(b.guest_id, 0) + 1
        prev = last_booking.get(b.guest_id)
        if prev is None or b.created_at > prev:
            last_booking[b.guest_id] = b.created_at

    last_game = dict(
        (
            await session.execute(
                select(GameAttempt.guest_id, func.max(GameAttempt.played_at))
                .group_by(GameAttempt.guest_id)
            )
        ).all()
    )
    last_rsvp = dict(
        (
            await session.execute(
                select(Rsvp.guest_id, func.max(Rsvp.updated_at)).group_by(
                    Rsvp.guest_id
                )
            )
        ).all()
    )

    out: List[dict] = []
    for guest, avatar in guests:
        candidates = [
            last_booking.get(guest.id),
            last_game.get(guest.id),
            last_rsvp.get(guest.id),
        ]
        last_activity = max((c for c in candidates if c is not None), default=None)
        rsvp = rsvp_by_guest.get(
            guest.id, {"christening": "maybe", "banquet": "maybe"}
        )
        out.append(
            {
                "id": str(guest.id),
                "name": guest.name,
                "birth_date": guest.birth_date.isoformat(),
                "gender": guest.gender.value
                if hasattr(guest.gender, "value")
                else guest.gender,
                "avatar_name": avatar.name,
                "avatar_url": avatar.image_url,
                "has_telegram": guest.telegram_id is not None,
                "telegram_username": guest.telegram_username,
                "rsvp_christening": rsvp["christening"],
                "rsvp_banquet": rsvp["banquet"],
                "bookings_count": int(bookings_per_guest.get(guest.id, 0)),
                "last_activity": last_activity.isoformat()
                if last_activity is not None
                else None,
                "created_at": guest.created_at.isoformat(),
            }
        )
    return out


async def admin_update_guest_rsvp(
    session: AsyncSession,
    *,
    guest_id: uuid.UUID,
    christening: Optional[str] = None,
    banquet: Optional[str] = None,
) -> dict:
    guest = (
        await session.execute(select(Guest).where(Guest.id == guest_id))
    ).scalar_one_or_none()
    if guest is None:
        raise GuestNotFound()

    pairs = [
        (EventPartType.CHRISTENING, christening),
        (EventPartType.BANQUET, banquet),
    ]
    for part_type, value in pairs:
        if value is None:
            continue
        new_status = RsvpStatus(value)
        row = (
            await session.execute(
                select(Rsvp).where(
                    Rsvp.guest_id == guest_id,
                    Rsvp.event_part_type == part_type,
                )
            )
        ).scalar_one_or_none()
        if row is not None:
            row.status = new_status
            row.updated_at = datetime.now(timezone.utc)
        else:
            session.add(
                Rsvp(
                    guest_id=guest_id,
                    event_part_type=part_type,
                    status=new_status,
                )
            )
    await session.commit()

    rsvp_rows = (
        await session.execute(select(Rsvp).where(Rsvp.guest_id == guest_id))
    ).scalars().all()
    out = {"christening": "maybe", "banquet": "maybe"}
    for r in rsvp_rows:
        out[r.event_part_type.value] = r.status.value
    return out


async def admin_delete_guest(
    session: AsyncSession, *, guest_id: uuid.UUID
) -> None:
    guest = (
        await session.execute(select(Guest).where(Guest.id == guest_id))
    ).scalar_one_or_none()
    if guest is None:
        raise GuestNotFound()
    # Free the avatar so a new guest can claim it.
    avatar = (
        await session.execute(select(Avatar).where(Avatar.id == guest.avatar_id))
    ).scalar_one_or_none()
    if avatar is not None:
        avatar.is_taken = False
    await session.delete(guest)  # cascades to rsvp, bookings, game_attempts
    await session.commit()


# -------- Bookings --------


async def list_bookings(session: AsyncSession) -> List[dict]:
    rows = (
        await session.execute(
            select(Booking, WishlistItem, Guest)
            .join(WishlistItem, WishlistItem.id == Booking.item_id)
            .join(Guest, Guest.id == Booking.guest_id)
            .order_by(Booking.created_at.desc())
        )
    ).all()
    return [
        {
            "booking_id": str(b.id),
            "item_id": str(item.id),
            "item_name": item.name,
            "item_price_rub": item.price_rub,
            "guest_id": str(g.id),
            "guest_name": g.name,
            "comment": b.comment,
            "created_at": b.created_at.isoformat(),
        }
        for b, item, g in rows
    ]


async def admin_cancel_booking(
    session: AsyncSession, *, booking_id: uuid.UUID
) -> None:
    booking = (
        await session.execute(select(Booking).where(Booking.id == booking_id))
    ).scalar_one_or_none()
    if booking is None:
        raise BookingNotFound()
    await session.delete(booking)
    await session.commit()
