import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.db.models.rsvp import EventPartType  # reuse the existing enum


class ParentRole(str, enum.Enum):
    MOTHER = "mother"
    FATHER = "father"


class EventMeta(Base):
    """Single row of event-wide metadata (title, dress code, wishes)."""

    __tablename__ = "event_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    dress_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wishes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class EventPart(Base):
    """Christening + Banquet rows; type enum reused from module 2 RSVP."""

    __tablename__ = "event_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[EventPartType] = mapped_column(
        Enum(
            EventPartType,
            name="event_part_type",
            values_callable=lambda x: [e.value for e in x],
            create_type=False,
        ),
        unique=True,
        nullable=False,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    yandex_maps_link: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    program: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Parent(Base):
    """One row per role: mom and dad."""

    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[ParentRole] = mapped_column(
        Enum(
            ParentRole,
            name="parent_role",
            values_callable=lambda x: [e.value for e in x],
        ),
        unique=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    telegram_username: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
