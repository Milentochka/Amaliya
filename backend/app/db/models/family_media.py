from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class FamilyMedia(Base):
    """Photo or muted video shown on the projector idle slideshow."""

    __tablename__ = "family_media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(Text, nullable=False)  # 'photo' | 'video'
    filename: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
