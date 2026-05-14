"""Host endpoints — controls contests, requires admin cookie."""

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.contests import (
    Contest1Overview,
    Contest1TallyIn,
    Contest1TraitOut,
    ContestStateOut,
    ContestStatusIn,
)
from app.services.contests import (
    InvalidStatus,
    TraitNotFound,
    contest1_overview,
    contest1_reset,
    contest1_set_tally,
    list_all_states,
    set_status,
)
from app.services.host_pdf import build_contest1_pdf, build_contest1_results_pdf
from app.services.wishlist import resolve_admin_id_from_token

router = APIRouter(prefix="/host", tags=["host"])


async def _require_admin(session: AsyncSession, token: Optional[str]) -> int:
    admin_id = await resolve_admin_id_from_token(session, token)
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован как админ",
        )
    return admin_id


@router.get("/contests", response_model=List[ContestStateOut])
async def overview(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await list_all_states(session)


@router.post("/contests/{contest_id}/status", response_model=ContestStateOut)
async def update_status(
    contest_id: int,
    payload: ContestStatusIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await set_status(session, contest_id, payload.status)
    except InvalidStatus:
        raise HTTPException(status_code=400, detail="Неверный статус")


@router.get("/contest1", response_model=Contest1Overview)
async def contest1(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest1_overview(session)


@router.put("/contest1/traits/{trait_id}/tally", response_model=Contest1TraitOut)
async def contest1_tally(
    trait_id: int,
    payload: Contest1TallyIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        result = await contest1_set_tally(
            session,
            trait_id=trait_id,
            votes_mom=payload.votes_mom,
            votes_dad=payload.votes_dad,
            votes_unique=payload.votes_unique,
            votes_relatives=(
                [r.model_dump() for r in payload.votes_relatives]
                if payload.votes_relatives is not None
                else None
            ),
        )
    except TraitNotFound:
        raise HTTPException(status_code=404, detail="Черта не найдена")
    # Re-fetch overview to get order_index/name (and consistent shape).
    full = await contest1_overview(session)
    return next(t for t in full["traits"] if t["id"] == trait_id)


@router.post("/contest1/reset")
async def contest1_reset_endpoint(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    await contest1_reset(session)
    return {"message": "reset"}


@router.get("/contest1/blank.pdf")
async def contest1_blank_pdf(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    pdf_bytes = await build_contest1_pdf(session)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="contest1-na-kogo-pohozha.pdf"'
        },
    )


@router.get("/contest1/results.pdf")
async def contest1_results_pdf(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    pdf_bytes = await build_contest1_results_pdf(session)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="contest1-results.pdf"'
        },
    )
