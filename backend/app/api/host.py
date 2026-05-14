"""Host endpoints — controls contests, requires admin cookie."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.auth import MessageOut
from app.schemas.contests import (
    Contest1Overview,
    Contest1TallyIn,
    Contest1TraitOut,
    Contest2ActiveIn,
    Contest2FirstCorrectIn,
    Contest2Overview,
    ContestStateOut,
    ContestStatusIn,
)
from app.services.contests import (
    InvalidStatus,
    QuestionNotFound,
    TraitNotFound,
    contest1_overview,
    contest1_reset,
    contest1_set_tally,
    contest2_clear_first_correct,
    contest2_overview,
    contest2_reset,
    contest2_set_active,
    contest2_set_first_correct,
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


# -------- Contest 2 --------


@router.get("/contest2", response_model=Contest2Overview)
async def contest2(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest2_overview(session, reveal=True)


@router.post("/contest2/active", response_model=ContestStateOut)
async def contest2_active(
    payload: Contest2ActiveIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await contest2_set_active(
            session,
            question_id=payload.question_id,
            show_answer=payload.show_answer,
        )
    except QuestionNotFound:
        raise HTTPException(status_code=404, detail="Вопрос не найден")


@router.put("/contest2/questions/{question_id}/first")
async def contest2_first(
    question_id: int,
    payload: Contest2FirstCorrectIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        guest_uuid = uuid.UUID(payload.guest_id) if payload.guest_id else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный guest_id")
    try:
        return await contest2_set_first_correct(
            session,
            question_id=question_id,
            guest_id=guest_uuid,
            guest_name=payload.guest_name,
        )
    except QuestionNotFound:
        raise HTTPException(status_code=404, detail="Вопрос не найден")


@router.delete(
    "/contest2/questions/{question_id}/first", response_model=MessageOut
)
async def contest2_first_clear(
    question_id: int,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    await contest2_clear_first_correct(session, question_id=question_id)
    return {"message": "cleared"}


@router.post("/contest2/reset", response_model=MessageOut)
async def contest2_reset_endpoint(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    await contest2_reset(session)
    return {"message": "reset"}
