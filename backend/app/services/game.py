"""Ангел Амалия mini-game services."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Avatar,
    EventPart,
    EventPartType,
    GameAttempt,
    Guest,
)


MAX_ATTEMPTS_PER_DAY = 3
MAX_SCORE_PER_ATTEMPT = 5000  # cheat ceiling — clean play ~ 0..1000

# Event happens in Moscow; calendar-day boundary uses Moscow midnight.
_MSK = timezone(timedelta(hours=3))

_UNLIMITED_GUESTS: set = set()


class TooManyAttempts(Exception):
    """Guest has used up all 3 attempts for the current Moscow calendar day."""


class GameClosed(Exception):
    """Cutoff has passed (Крестины start)."""


def _today_start_utc() -> datetime:
    now_msk = datetime.now(_MSK)
    midnight_msk = datetime(
        now_msk.year, now_msk.month, now_msk.day, tzinfo=_MSK
    )
    return midnight_msk.astimezone(timezone.utc)


async def _get_cutoff(session: AsyncSession) -> datetime:
    part = (
        await session.execute(
            select(EventPart).where(EventPart.type == EventPartType.CHRISTENING)
        )
    ).scalar_one()
    # start_time is timezone-aware UTC from DB
    return part.start_time


async def _is_closed(session: AsyncSession) -> bool:
    cutoff = await _get_cutoff(session)
    return datetime.now(timezone.utc) >= cutoff


async def _count_attempts_today(session: AsyncSession, guest_id: uuid.UUID) -> int:
    today_start = _today_start_utc()
    return (
        await session.execute(
            select(func.count(GameAttempt.id))
            .where(GameAttempt.guest_id == guest_id)
            .where(GameAttempt.played_at >= today_start)
        )
    ).scalar_one()


async def _total_score(session: AsyncSession, guest_id: uuid.UUID) -> int:
    total = (
        await session.execute(
            select(func.coalesce(func.sum(GameAttempt.score), 0)).where(
                GameAttempt.guest_id == guest_id
            )
        )
    ).scalar_one()
    return int(total or 0)


async def _rank_of(session: AsyncSession, guest_id: uuid.UUID) -> Optional[int]:
    """1-indexed rank by total score. None if guest has no plays yet."""
    my_total = await _total_score(session, guest_id)
    if my_total <= 0:
        return None
    sub = (
        select(
            GameAttempt.guest_id.label("g"),
            func.sum(GameAttempt.score).label("total"),
        )
        .group_by(GameAttempt.guest_id)
        .subquery()
    )
    ahead = (
        await session.execute(
            select(func.count())
            .select_from(sub)
            .where(sub.c.total > my_total)
        )
    ).scalar_one()
    return int(ahead) + 1


async def get_stats(session: AsyncSession, guest_id: uuid.UUID) -> dict:
    cutoff = await _get_cutoff(session)
    is_closed = datetime.now(timezone.utc) >= cutoff
    attempts_today = await _count_attempts_today(session, guest_id)
    unlimited = guest_id in _UNLIMITED_GUESTS
    return {
        "total_score": await _total_score(session, guest_id),
        "attempts_today": attempts_today,
        "attempts_left_today": (
            9999 if unlimited else max(0, MAX_ATTEMPTS_PER_DAY - attempts_today)
        ),
        "rank": await _rank_of(session, guest_id),
        "is_closed": is_closed,
        "cutoff_iso": cutoff.isoformat(),
    }


async def record_attempt(
    session: AsyncSession, *, guest_id: uuid.UUID, score: int
) -> dict:
    if await _is_closed(session):
        raise GameClosed()
    if guest_id not in _UNLIMITED_GUESTS:
        used = await _count_attempts_today(session, guest_id)
        if used >= MAX_ATTEMPTS_PER_DAY:
            raise TooManyAttempts()
    session.add(GameAttempt(id=uuid.uuid4(), guest_id=guest_id, score=score))
    await session.commit()
    return await get_stats(session, guest_id)


async def get_leaderboard(session: AsyncSession, top_n: int = 10) -> dict:
    cutoff = await _get_cutoff(session)
    is_closed = datetime.now(timezone.utc) >= cutoff

    stmt = (
        select(
            Guest.id,
            Guest.name,
            Avatar.image_url,
            func.sum(GameAttempt.score).label("total_score"),
        )
        .join(GameAttempt, GameAttempt.guest_id == Guest.id)
        .join(Avatar, Avatar.id == Guest.avatar_id)
        .group_by(Guest.id, Guest.name, Avatar.image_url)
        .order_by(func.sum(GameAttempt.score).desc(), func.min(GameAttempt.played_at))
        .limit(top_n)
    )
    rows = (await session.execute(stmt)).all()
    entries: List[dict] = []
    for i, r in enumerate(rows):
        entries.append(
            {
                "rank": i + 1,
                "guest_id": str(r.id),
                "name": r.name,
                "avatar_url": r.image_url,
                "total_score": int(r.total_score),
            }
        )

    winner_id = entries[0]["guest_id"] if (is_closed and entries) else None
    return {
        "is_closed": is_closed,
        "entries": entries,
        "winner_guest_id": winner_id,
    }
