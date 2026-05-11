"""Pydantic schemas for /api/event."""

from typing import List, Literal, Optional

from pydantic import BaseModel


class EventPartOut(BaseModel):
    type: Literal["christening", "banquet"]
    start_time: str  # ISO 8601 UTC
    address: Optional[str] = None
    yandex_maps_link: Optional[str] = None
    program: Optional[str] = None
    photos: List[str] = []
    additional_info: Optional[str] = None


class ParentOut(BaseModel):
    role: Literal["mother", "father"]
    name: str
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    telegram_username: Optional[str] = None


class EventOut(BaseModel):
    title: str
    dress_code: Optional[str] = None
    wishes: Optional[str] = None
    countdown_target: str  # ISO 8601 — Christening start_time
    parts: List[EventPartOut]
    parents: List[ParentOut]


class GuestPublicOut(BaseModel):
    """Gues entry on the public list — name + avatar + zodiac, no DOB."""

    name: str
    avatar_url: str
    avatar_name: str
    zodiac: str
    chinese_zodiac: str
