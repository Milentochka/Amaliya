"""Projector endpoints — public, read-only, no auth."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.contests import Contest1Overview, Contest2Overview, ContestStateOut
from app.services.contests import (
    contest1_overview,
    contest2_overview,
    list_all_states,
)

router = APIRouter(prefix="/projector", tags=["projector"])


@router.get("/contests", response_model=List[ContestStateOut])
async def all_states(session: AsyncSession = Depends(get_session)):
    return await list_all_states(session)


@router.get("/contest1", response_model=Contest1Overview)
async def contest1(session: AsyncSession = Depends(get_session)):
    return await contest1_overview(session)


@router.get("/contest2", response_model=Contest2Overview)
async def contest2(session: AsyncSession = Depends(get_session)):
    """Projector view. Hides correct_index unless the host has flipped
    show_answer for the currently active question."""
    data = await contest2_overview(session, reveal=False)
    step = data["state"]["active_step"] or {}
    active_qid = step.get("question_id")
    show = bool(step.get("show_answer"))
    if active_qid is not None and show:
        from app.db.models import Contest2Question
        from sqlalchemy import select
        q = (
            await session.execute(
                select(Contest2Question).where(Contest2Question.id == active_qid)
            )
        ).scalar_one_or_none()
        if q is not None:
            for item in data["questions"]:
                if item["id"] == active_qid:
                    item["correct_index"] = q.correct_index
                    break
    return data
