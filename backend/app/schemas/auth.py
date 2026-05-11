"""Pydantic schemas for guest and admin auth endpoints."""

import re
from datetime import date
from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# -------- DOB parsing (DD/MM/YY) --------

_DOB_RE = re.compile(r"^\s*(\d{2})/(\d{2})/(\d{2})\s*$")
_MIN_BIRTH_DATE = date(1940, 1, 1)


def parse_dd_mm_yy(value: str) -> date:
    """DD/MM/YY → date with pivot rule:
    00-26 → 2000-2026
    27-39 → rejected (would map to 1927-1939, outside diapason)
    40-99 → 1940-1999
    Also rejects future dates and dates < 1940-01-01.
    """
    m = _DOB_RE.match(value)
    if not m:
        raise ValueError("Формат даты должен быть ДД/ММ/ГГ")
    day, month, yy = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if 0 <= yy <= 26:
        year = 2000 + yy
    elif 27 <= yy <= 39:
        raise ValueError("Дата вне допустимого диапазона")
    else:  # 40-99
        year = 1900 + yy
    try:
        d = date(year, month, day)
    except ValueError:
        raise ValueError("Некорректная дата")
    if d > date.today():
        raise ValueError("Дата вне допустимого диапазона")
    if d < _MIN_BIRTH_DATE:
        raise ValueError("Дата вне допустимого диапазона")
    return d


# -------- Inputs --------


class GuestLookupIn(BaseModel):
    """Step 1 of the two-step flow: just identity probe."""

    name: str = Field(min_length=1, max_length=100)
    birth_date: str = Field(description="DD/MM/YY")

    @field_validator("name")
    @classmethod
    def trim_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date_format(cls, v: str) -> str:
        parse_dd_mm_yy(v)
        return v.strip()


class GuestRegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    birth_date: str = Field(description="DD/MM/YY")
    gender: Literal["M", "F"]
    rsvp_christening: Literal["coming", "not_coming", "maybe"]
    rsvp_banquet: Literal["coming", "not_coming", "maybe"]

    @field_validator("name")
    @classmethod
    def trim_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date_format(cls, v: str) -> str:
        parse_dd_mm_yy(v)  # raises ValueError on invalid
        return v.strip()


class AdminLoginIn(BaseModel):
    login: str
    password: str


# -------- Outputs --------


class AvatarOut(BaseModel):
    id: int
    name: str
    image_url: str


class GuestOut(BaseModel):
    id: str
    name: str
    birth_date: str  # ISO YYYY-MM-DD
    gender: str
    avatar: AvatarOut
    zodiac: str
    chinese_zodiac: str
    has_telegram: bool
    telegram_username: Optional[str] = None


class GuestRegisterOut(BaseModel):
    guest: GuestOut
    rsvp: Dict[str, str]  # {"christening": "coming", "banquet": "maybe"}


class AdminOut(BaseModel):
    id: int
    role: Literal["mom", "dad"]
    login: str


class MessageOut(BaseModel):
    message: str


class TelegramBindCodeOut(BaseModel):
    code: str
    bot_username: str
    expires_at: str
