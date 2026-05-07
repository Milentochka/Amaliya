"""Pydantic schemas for wishlist endpoints."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# -------- Outputs --------


class WishlistItemPublic(BaseModel):
    """What a regular guest sees about each item."""

    id: str
    name: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price_rub: Optional[int] = None
    ozon_url: Optional[str] = None
    category: Optional[str] = None
    priority: Literal["high", "normal"]
    can_be_shared: bool
    is_booked: bool                      # any booking exists
    booked_by_me: bool                   # the viewer is among bookers
    my_booking_id: Optional[str] = None  # if booked_by_me, the id to cancel
    my_comment: Optional[str] = None     # the viewer's own comment, if booked


class BookerPublic(BaseModel):
    guest_id: str
    name: str
    comment: str


class WishlistItemAdmin(WishlistItemPublic):
    """Admin sees full booker list with names and comments."""

    bookers: List[BookerPublic] = []


class MyBookingOut(BaseModel):
    booking_id: str
    item: WishlistItemPublic
    comment: str
    created_at: str  # ISO


# -------- Inputs --------


class BookItemIn(BaseModel):
    comment: str = Field(min_length=1, max_length=500)


class WishlistItemCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    photo_url: Optional[str] = Field(default=None, max_length=500)
    price_rub: Optional[int] = Field(default=None, ge=0)
    ozon_url: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    priority: Literal["high", "normal"] = "normal"
    can_be_shared: bool = False


class WishlistItemUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    photo_url: Optional[str] = Field(default=None, max_length=500)
    price_rub: Optional[int] = Field(default=None, ge=0)
    ozon_url: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    priority: Optional[Literal["high", "normal"]] = None
    can_be_shared: Optional[bool] = None
