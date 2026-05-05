import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class TelegramBindingCodeOwnerType(str, enum.Enum):
    GUEST = "guest"
    ADMIN = "admin"


class TelegramBindingCode(Base):
    """One-time code shown in LK that the user pastes into the bot via /start <code>."""

    __tablename__ = "telegram_binding_codes"

    code: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_type: Mapped[TelegramBindingCodeOwnerType] = mapped_column(
        Enum(
            TelegramBindingCodeOwnerType,
            name="tg_binding_owner_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    owner_id: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    used: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
