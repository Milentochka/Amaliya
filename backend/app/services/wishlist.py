"""Wishlist services: list items, book/cancel, admin CRUD."""

import uuid
from typing import Dict, List, Optional, Tuple

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Booking, Guest, WishlistItem


# -------- Errors --------


class ItemNotFound(Exception):
    pass


class ItemAlreadyBooked(Exception):
    """Non-shareable item is already booked by someone else."""


class BookingNotFound(Exception):
    pass


class NotYourBooking(Exception):
    pass


# -------- Helpers --------


def _serialize_item(
    item: WishlistItem,
    *,
    bookings: List[Booking],
    viewer_guest_id: uuid.UUID,
) -> dict:
    my_booking = next(
        (b for b in bookings if b.guest_id == viewer_guest_id), None
    )
    return {
        "id": str(item.id),
        "name": item.name,
        "description": item.description,
        "photo_url": item.photo_url,
        "price_rub": item.price_rub,
        "ozon_url": item.ozon_url,
        "category": item.category,
        "priority": item.priority.value if hasattr(item.priority, "value") else item.priority,
        "can_be_shared": item.can_be_shared,
        "is_booked": len(bookings) > 0,
        "booked_by_me": my_booking is not None,
        "my_booking_id": str(my_booking.id) if my_booking else None,
        "my_comment": my_booking.comment if my_booking else None,
    }


def _admin_extras(
    bookings: List[Booking], guests_by_id: Dict[uuid.UUID, Guest]
) -> List[dict]:
    return [
        {
            "guest_id": str(b.guest_id),
            "name": guests_by_id[b.guest_id].name if b.guest_id in guests_by_id else "—",
            "comment": b.comment,
        }
        for b in bookings
    ]


# -------- List items --------


async def list_items_for_guest(
    session: AsyncSession, *, viewer_guest_id: uuid.UUID
) -> List[dict]:
    items = (
        await session.execute(
            select(WishlistItem).order_by(
                WishlistItem.priority.asc(), WishlistItem.created_at
            )
        )
    ).scalars().all()

    bookings = (
        await session.execute(select(Booking))
    ).scalars().all()

    by_item: Dict[uuid.UUID, List[Booking]] = {}
    for b in bookings:
        by_item.setdefault(b.item_id, []).append(b)

    return [
        _serialize_item(
            item, bookings=by_item.get(item.id, []), viewer_guest_id=viewer_guest_id
        )
        for item in items
    ]


async def list_items_for_admin(session: AsyncSession) -> List[dict]:
    items = (
        await session.execute(
            select(WishlistItem).order_by(
                WishlistItem.priority.asc(), WishlistItem.created_at
            )
        )
    ).scalars().all()
    bookings = (
        await session.execute(select(Booking))
    ).scalars().all()
    guests = (await session.execute(select(Guest))).scalars().all()
    guests_by_id = {g.id: g for g in guests}

    by_item: Dict[uuid.UUID, List[Booking]] = {}
    for b in bookings:
        by_item.setdefault(b.item_id, []).append(b)

    fake_viewer = uuid.UUID("00000000-0000-0000-0000-000000000000")
    out = []
    for item in items:
        item_bookings = by_item.get(item.id, [])
        d = _serialize_item(item, bookings=item_bookings, viewer_guest_id=fake_viewer)
        d["bookers"] = _admin_extras(item_bookings, guests_by_id)
        out.append(d)
    return out


# -------- Book / cancel --------


async def book_item(
    session: AsyncSession,
    *,
    item_id: uuid.UUID,
    guest_id: uuid.UUID,
    comment: str,
) -> Tuple[Booking, WishlistItem, Guest]:
    """Atomically book an item. Locks the item row to prevent races
    on non-shareable items. Raises ItemAlreadyBooked if a different guest
    already has this non-shareable item.
    """
    # Lock the item for update so concurrent bookings serialize.
    item = (
        await session.execute(
            select(WishlistItem)
            .where(WishlistItem.id == item_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if item is None:
        raise ItemNotFound()

    if not item.can_be_shared:
        # Any existing booking from any guest blocks new bookings.
        existing = (
            await session.execute(
                select(Booking).where(Booking.item_id == item_id)
            )
        ).scalars().all()
        # Same-guest re-booking is denied by the unique constraint below; here
        # we only refuse if a *different* guest already booked.
        for b in existing:
            if b.guest_id != guest_id:
                raise ItemAlreadyBooked()

    booking = Booking(
        id=uuid.uuid4(),
        item_id=item_id,
        guest_id=guest_id,
        comment=comment,
    )
    session.add(booking)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        # The (item_id, guest_id) unique constraint fired — the same guest
        # has already booked this item.
        raise ItemAlreadyBooked()
    await session.refresh(booking)

    guest = (
        await session.execute(select(Guest).where(Guest.id == guest_id))
    ).scalar_one()
    return booking, item, guest


async def cancel_my_booking(
    session: AsyncSession, *, booking_id: uuid.UUID, guest_id: uuid.UUID
) -> None:
    booking = (
        await session.execute(select(Booking).where(Booking.id == booking_id))
    ).scalar_one_or_none()
    if booking is None:
        raise BookingNotFound()
    if booking.guest_id != guest_id:
        raise NotYourBooking()
    await session.delete(booking)
    await session.commit()


async def list_my_bookings(
    session: AsyncSession, *, guest_id: uuid.UUID
) -> List[dict]:
    bookings = (
        await session.execute(
            select(Booking)
            .where(Booking.guest_id == guest_id)
            .order_by(desc(Booking.created_at))
        )
    ).scalars().all()
    if not bookings:
        return []
    item_ids = {b.item_id for b in bookings}
    items_list = (
        await session.execute(
            select(WishlistItem).where(WishlistItem.id.in_(item_ids))
        )
    ).scalars().all()
    items_by_id = {i.id: i for i in items_list}

    out = []
    for b in bookings:
        item = items_by_id.get(b.item_id)
        if item is None:
            continue
        out.append(
            {
                "booking_id": str(b.id),
                "item": _serialize_item(
                    item, bookings=[b], viewer_guest_id=guest_id
                ),
                "comment": b.comment,
                "created_at": b.created_at.isoformat(),
            }
        )
    return out


# -------- Admin CRUD --------


async def admin_create_item(
    session: AsyncSession, payload: dict
) -> WishlistItem:
    item = WishlistItem(id=uuid.uuid4(), **payload)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


async def admin_update_item(
    session: AsyncSession, item_id: uuid.UUID, payload: dict
) -> WishlistItem:
    item = (
        await session.execute(
            select(WishlistItem).where(WishlistItem.id == item_id)
        )
    ).scalar_one_or_none()
    if item is None:
        raise ItemNotFound()
    for k, v in payload.items():
        if v is not None:
            setattr(item, k, v)
    await session.commit()
    await session.refresh(item)
    return item


async def admin_delete_item(
    session: AsyncSession, item_id: uuid.UUID
) -> None:
    item = (
        await session.execute(
            select(WishlistItem).where(WishlistItem.id == item_id)
        )
    ).scalar_one_or_none()
    if item is None:
        raise ItemNotFound()
    await session.delete(item)  # cascade removes its bookings
    await session.commit()


# -------- Resolve admin from cookie --------


async def resolve_admin_id_from_token(
    session: AsyncSession, token: Optional[str]
) -> Optional[int]:
    """Returns admin.id if cookie is a valid admin session, else None."""
    if not token:
        return None
    from datetime import datetime, timezone

    from app.db.models import Session as DbSession, SessionOwnerType

    db_session = (
        await session.execute(
            select(DbSession).where(DbSession.token == token)
        )
    ).scalar_one_or_none()
    if db_session is None:
        return None
    if db_session.owner_type != SessionOwnerType.ADMIN:
        return None
    if db_session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    return int(db_session.owner_id)
