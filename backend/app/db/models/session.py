import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SessionOwnerType(str, enum.Enum):
    GUEST = "guest"
    ADMIN = "admin"


class Session(Base):
    """Server-side session record. Token also signed in a JWT cookie."""

    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_type: Mapped[SessionOwnerType] = mapped_column(
        Enum(
            SessionOwnerType,
            name="session_owner_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    owner_id: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # uuid string for guest, int as string for admin
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
