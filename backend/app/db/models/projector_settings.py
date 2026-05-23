from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class ProjectorSettings(Base):
    """Single-row table (id=1) controlling projector mode.

    `contests_enabled = false` → projector always shows family slideshow.
    `contests_enabled = true`  → projector shows active contest, or
                                 «Минуточку…» between contests.
    """

    __tablename__ = "projector_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contests_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
