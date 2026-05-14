"""Pydantic schemas for contest endpoints."""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


class ContestStateOut(BaseModel):
    contest_id: int
    status: Literal["not_started", "active", "closed"]
    active_step: Dict[str, Any] = {}


class ContestStatusIn(BaseModel):
    status: Literal["not_started", "active", "closed"]


class RelativeVote(BaseModel):
    name: str
    count: int


class Contest1TraitOut(BaseModel):
    id: int
    order_index: int
    name: str
    votes_mom: int
    votes_dad: int
    votes_unique: int
    votes_relatives: List[RelativeVote] = []


class Contest1Summary(BaseModel):
    totals: Dict[str, int]
    top_relative_name: Optional[str] = None
    top_relative_count: int = 0
    verdict: Optional[str] = None


class Contest1Overview(BaseModel):
    state: ContestStateOut
    traits: List[Contest1TraitOut]
    summary: Contest1Summary


class Contest1TallyIn(BaseModel):
    votes_mom: Optional[int] = None
    votes_dad: Optional[int] = None
    votes_unique: Optional[int] = None
    votes_relatives: Optional[List[RelativeVote]] = None
