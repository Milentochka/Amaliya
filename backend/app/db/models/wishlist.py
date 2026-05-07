import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class WishlistPriority(str, enum.Enum):
    HIGH = "high"      # ★ очень хочу
    NORMAL = "normal"  # ✦ было бы здорово


class WishlistItem(Base):
    """A gift on the wishlist."""

    __tablename__ = "wishlist_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_rub: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ozon_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[WishlistPriority] = mapped_column(
        Enum(
            WishlistPriority,
            name="wishlist_priority",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        server_default="normal",
    )
    can_be_shared: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Booking(Base):
    """One guest booking one item. Same (item, guest) pair cannot repeat.

    Per-item uniqueness for non-shared items is enforced in app logic
    (services.wishlist) via SELECT … FOR UPDATE on the item row.
    """

    __tablename__ = "bookings"
    __table_args__ = (
        UniqueConstraint("item_id", "guest_id", name="uq_booking_item_guest"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("wishlist_items.id", ondelete="CASCADE"), nullable=False
    )
    guest_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("guests.id", ondelete="CASCADE"), nullable=False
    )
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
