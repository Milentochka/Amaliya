"""Pydantic schemas for admin data endpoints."""

from typing import List, Literal, Optional

from pydantic import BaseModel


class StatsCounts(BaseModel):
    coming: int
    not_coming: int
    maybe: int


class DashboardStats(BaseModel):
    guests_total: int
    christening: StatsCounts
    banquet: StatsCounts
    wishlist_total: int
    wishlist_booked: int
    wishlist_free: int
    bookings_total: int
    bookings_sum_rub: int
    game_players: int
    game_attempts: int


class GuestAdminOut(BaseModel):
    id: str
    name: str
    birth_date: str  # ISO YYYY-MM-DD
    gender: str
    avatar_name: str
    avatar_url: str
    has_telegram: bool
    telegram_username: Optional[str] = None
    rsvp_christening: Literal["coming", "not_coming", "maybe"]
    rsvp_banquet: Literal["coming", "not_coming", "maybe"]
    bookings_count: int
    last_activity: Optional[str] = None  # ISO
    created_at: str  # ISO


class AdminRsvpUpdateIn(BaseModel):
    christening: Optional[Literal["coming", "not_coming", "maybe"]] = None
    banquet: Optional[Literal["coming", "not_coming", "maybe"]] = None


class BookingAdminOut(BaseModel):
    booking_id: str
    item_id: str
    item_name: str
    item_price_rub: Optional[int] = None
    guest_id: str
    guest_name: str
    comment: str
    created_at: str  # ISO
