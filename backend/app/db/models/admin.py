import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AdminRole(str, enum.Enum):
    MOM = "mom"
    DAD = "dad"


class Admin(Base):
    """Two admin accounts: mom and dad. Equal rights."""

    __tablename__ = "admin"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[AdminRole] = mapped_column(
        Enum(
            AdminRole,
            name="admin_role",
            values_callable=lambda x: [e.value for e in x],
        ),
        unique=True,
        nullable=False,
    )
    login: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_id: Mapped[int | None] = mapped_column(
        ForeignKey("avatars.id"), nullable=True
    )
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    telegram_username: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
