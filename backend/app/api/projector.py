"""Projector endpoints — public, read-only, no auth."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.contests import Contest1Overview, ContestStateOut
from app.services.contests import contest1_overview, list_all_states

router = APIRouter(prefix="/projector", tags=["projector"])


@router.get("/contests", response_model=List[ContestStateOut])
async def all_states(session: AsyncSession = Depends(get_session)):
    return await list_all_states(session)


@router.get("/contest1", response_model=Contest1Overview)
async def contest1(session: AsyncSession = Depends(get_session)):
    return await contest1_overview(session)
