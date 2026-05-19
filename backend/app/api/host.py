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
    Contest3AssignIn,
    Contest3CurrentGuest,
    Contest3MarkReadIn,
    Contest3Stats,
    Contest4ActiveIn,
    Contest4Overview,
    Contest5OpenIn,
    Contest5Overview,
    Contest5ResolveIn,
    Contest5TeamUpdateIn,
    ContestStateOut,
    ContestStatusIn,
)
from app.services.contests import (
    InvalidStatus,
    NoGuestPending,
    QuestionNotFound,
    TeamNotFound,
    TraitNotFound,
    contest1_overview,
    contest1_reset,
    contest1_set_tally,
    contest2_clear_first_correct,
    contest2_overview,
    contest2_reset,
    contest2_set_active,
    contest2_set_first_correct,
    contest3_admin_overview,
    contest3_assign_random,
    contest3_clear_active,
    contest3_mark_read,
    contest3_pick_next,
    contest3_reset,
    contest4_overview,
    contest4_set_active,
    contest5_close_active,
    contest5_open_final,
    contest5_open_question,
    contest5_overview,
    contest5_reset,
    contest5_resolve,
    contest5_resolve_final,
    contest5_reveal_final,
    contest5_show_answer,
    contest5_update_team,
    list_all_states,
    set_status,
)
from app.services.host_pdf import (
    build_contest1_pdf,
    build_contest1_results_pdf,
    build_contest3_cards_pdf,
    build_contest4_all_blanks_pdf,
    build_contest4_blank_pdf,
    build_thank_you_cards_pdf,
)
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


# -------- Contest 3 «50 обещаний» --------


@router.get("/contest3", response_model=Contest3Stats)
async def contest3(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest3_admin_overview(session)


@router.post("/contest3/assign", response_model=Contest3Stats)
async def contest3_assign(
    payload: Contest3AssignIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest3_assign_random(session, per_guest=payload.per_guest)


@router.post("/contest3/next", response_model=Contest3CurrentGuest)
async def contest3_next(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await contest3_pick_next(session)
    except NoGuestPending:
        raise HTTPException(
            status_code=409,
            detail="Все гости с обещаниями уже зачитали свои",
        )


@router.post("/contest3/mark-read", response_model=MessageOut)
async def contest3_mark(
    payload: Contest3MarkReadIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    await contest3_mark_read(session, promise_ids=payload.promise_ids)
    return {"message": "marked"}


@router.post("/contest3/clear-active", response_model=MessageOut)
async def contest3_clear(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    await contest3_clear_active(session)
    return {"message": "cleared"}


@router.post("/contest3/reset", response_model=MessageOut)
async def contest3_reset_endpoint(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    await contest3_reset(session)
    return {"message": "reset"}


@router.get("/contest3/cards.pdf")
async def contest3_cards_pdf(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    pdf_bytes = await build_contest3_cards_pdf(session)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="contest3-cards.pdf"'
        },
    )


# -------- Contest 4 «Знак зодиака» --------


@router.get("/contest4", response_model=Contest4Overview)
async def contest4(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest4_overview(session)


@router.post("/contest4/active", response_model=ContestStateOut)
async def contest4_active(
    payload: Contest4ActiveIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await contest4_set_active(session, zodiac_key=payload.zodiac_key)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неизвестный знак")


@router.get("/contest4/blanks/{zodiac_key}.pdf")
async def contest4_one_blank(
    zodiac_key: str,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    pdf_bytes = await build_contest4_blank_pdf(session, zodiac_key=zodiac_key)
    if pdf_bytes is None:
        raise HTTPException(status_code=404, detail="Знак не найден")
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="contest4-{zodiac_key}.pdf"'
        },
    )


# -------- Contest 5 «Своя игра» --------


@router.get("/contest5", response_model=Contest5Overview)
async def contest5(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest5_overview(session)


@router.post("/contest5/open", response_model=Contest5Overview)
async def contest5_open(
    payload: Contest5OpenIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await contest5_open_question(session, question_id=payload.question_id)
    except QuestionNotFound:
        raise HTTPException(status_code=404, detail="Вопрос не найден")


@router.post("/contest5/show-answer", response_model=Contest5Overview)
async def contest5_reveal(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest5_show_answer(session)


@router.post("/contest5/resolve", response_model=Contest5Overview)
async def contest5_resolve_q(
    payload: Contest5ResolveIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await contest5_resolve(
            session,
            question_id=payload.question_id,
            team_id=payload.team_id,
            correct=payload.correct,
        )
    except QuestionNotFound:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    except TeamNotFound:
        raise HTTPException(status_code=404, detail="Команда не найдена")


@router.post("/contest5/close", response_model=Contest5Overview)
async def contest5_close(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest5_close_active(session)


@router.patch("/contest5/teams/{team_id}", response_model=Contest5Overview)
async def contest5_team_update(
    team_id: int,
    payload: Contest5TeamUpdateIn,
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    try:
        return await contest5_update_team(
            session,
            team_id=team_id,
            name=payload.name,
            color=payload.color,
            score=payload.score,
            final_wager=payload.final_wager,
            final_correct=payload.final_correct,
        )
    except TeamNotFound:
        raise HTTPException(status_code=404, detail="Команда не найдена")


@router.post("/contest5/final/open", response_model=Contest5Overview)
async def contest5_final_open(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest5_open_final(session)


@router.post("/contest5/final/reveal", response_model=Contest5Overview)
async def contest5_final_reveal(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest5_reveal_final(session)


@router.post("/contest5/final/resolve", response_model=Contest5Overview)
async def contest5_final_resolve(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest5_resolve_final(session)


@router.post("/contest5/reset", response_model=Contest5Overview)
async def contest5_reset_endpoint(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    return await contest5_reset(session)


@router.get("/contest4/blanks-all.pdf")
async def contest4_all_blanks(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    pdf_bytes = await build_contest4_all_blanks_pdf(session)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="contest4-all-zodiacs.pdf"'
        },
    )


# -------- Thank-you cards --------


@router.get("/thank-you.pdf")
async def thank_you_cards_pdf(
    amaliya_admin_session: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
):
    await _require_admin(session, amaliya_admin_session)
    pdf_bytes = await build_thank_you_cards_pdf()
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="thank-you-cards.pdf"'
        },
    )
