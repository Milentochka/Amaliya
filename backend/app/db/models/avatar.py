from sqlalchemy import Boolean, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Avatar(Base):
    """Pool of fairy-tale-hero avatars (51 in total).

    Two are reserved for admins (Котёнок Гав → mom, Бонифаций → dad);
    the remaining 49 are randomly assigned to guests at registration.
    """

    __tablename__ = "avatars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_taken: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    reserved_for_admin: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
