"""Ангел Амалия game endpoints."""

import uuid
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.game import (
    GameAttemptIn,
    GameStatsOut,
    LeaderboardOut,
)
from app.services.auth import resolve_guest_from_token
from app.services.game import (
    GameClosed,
    TooManyAttempts,
    get_leaderboard,
    get_stats,
    record_attempt,
)

router = APIRouter(prefix="/game", tags=["game"])


async def _require_guest(
    session: AsyncSession, token: Optional[str]
) -> uuid.UUID:
    guest = await resolve_guest_from_token(session, token)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован"
        )
    return uuid.UUID(guest["id"])


@router.get("/my-stats", response_model=GameStatsOut)
async def my_stats(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest_id = await _require_guest(session, amaliya_guest_session)
    return await get_stats(session, guest_id)


@router.post("/attempts", response_model=GameStatsOut)
async def submit_attempt(
    payload: GameAttemptIn,
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    guest_id = await _require_guest(session, amaliya_guest_session)
    try:
        return await record_attempt(
            session, guest_id=guest_id, score=payload.score
        )
    except GameClosed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Игра уже завершена",
        )
    except TooManyAttempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Сегодня все 3 попытки израсходованы. Возвращайся завтра!",
        )


@router.get("/leaderboard", response_model=LeaderboardOut)
async def leaderboard(
    amaliya_guest_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_guest(session, amaliya_guest_session)
    return await get_leaderboard(session, top_n=10)
