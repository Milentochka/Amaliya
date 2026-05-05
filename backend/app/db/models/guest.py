import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class GuestGender(str, enum.Enum):
    M = "M"
    F = "F"


class Guest(Base):
    """A registered guest. Identity = (name, birth_date) — no password."""

    __tablename__ = "guests"
    __table_args__ = (
        UniqueConstraint("name", "birth_date", name="uq_guest_name_birth_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[GuestGender] = mapped_column(
        Enum(
            GuestGender,
            name="guest_gender",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    avatar_id: Mapped[int] = mapped_column(ForeignKey("avatars.id"), nullable=False)
    telegram_id: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, nullable=True
    )
    telegram_username: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
