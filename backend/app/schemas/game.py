"""Pydantic schemas for the Ангел Амалия mini-game."""

from typing import List, Optional

from pydantic import BaseModel, Field


class GameAttemptIn(BaseModel):
    score: int = Field(ge=0, le=5000)


class GameStatsOut(BaseModel):
    total_score: int
    attempts_today: int
    attempts_left_today: int
    rank: Optional[int]
    is_closed: bool
    cutoff_iso: str  # when the game closes


class LeaderboardEntry(BaseModel):
    rank: int
    guest_id: str
    name: str
    avatar_url: str
    total_score: int


class LeaderboardOut(BaseModel):
    is_closed: bool
    entries: List[LeaderboardEntry]
    winner_guest_id: Optional[str] = None  # populated when is_closed
