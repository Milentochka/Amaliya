"""ORM models for contests (Module 4)."""

import enum
import uuid
from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import Enum, ForeignKey, Integer, Text, Uuid
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime

from app.db.database import Base


class ContestStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    ACTIVE = "active"
    CLOSED = "closed"


class ContestState(Base):
    __tablename__ = "contest_state"

    contest_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[ContestStatus] = mapped_column(
        Enum(
            ContestStatus,
            name="contest_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=ContestStatus.NOT_STARTED,
    )
    active_step: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Contest1Trait(Base):
    __tablename__ = "contest1_trait"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)


class Contest1VoteTally(Base):
    __tablename__ = "contest1_vote_tally"

    trait_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("contest1_trait.id", ondelete="CASCADE"),
        primary_key=True,
    )
    votes_mom: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    votes_dad: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    votes_unique: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    votes_relatives: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )


class Contest2Question(Base):
    __tablename__ = "contest2_question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[List[str]] = mapped_column(ARRAY(Text), nullable=False)
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)


class Contest2FirstCorrect(Base):
    __tablename__ = "contest2_first_correct"

    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("contest2_question.id", ondelete="CASCADE"),
        primary_key=True,
    )
    guest_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("guests.id", ondelete="SET NULL"), nullable=True
    )
    guest_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    set_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
