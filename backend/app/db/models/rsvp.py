import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class EventPartType(str, enum.Enum):
    CHRISTENING = "christening"
    BANQUET = "banquet"


class RsvpStatus(str, enum.Enum):
    COMING = "coming"
    NOT_COMING = "not_coming"
    MAYBE = "maybe"


class Rsvp(Base):
    """RSVP per guest per event part. Composite PK (guest_id, event_part_type)."""

    __tablename__ = "rsvp"

    guest_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("guests.id", ondelete="CASCADE"), primary_key=True
    )
    event_part_type: Mapped[EventPartType] = mapped_column(
        Enum(
            EventPartType,
            name="event_part_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        primary_key=True,
    )
    status: Mapped[RsvpStatus] = mapped_column(
        Enum(
            RsvpStatus,
            name="rsvp_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
