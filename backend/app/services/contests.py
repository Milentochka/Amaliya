"""Contest services (Module 4)."""

import random
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Avatar,
    Contest1Trait,
    Contest1VoteTally,
    Contest2FirstCorrect,
    Contest2Question,
    Contest3Promise,
    Contest5Category,
    Contest5Final,
    Contest5Question,
    Contest5Team,
    ContestState,
    ContestStatus,
    Guest,
    ZodiacTraitTemplate,
)
from app.services.zodiac import western_zodiac

_ZODIAC_NAME_TO_KEY = {
    "Овен": "aries",
    "Телец": "taurus",
    "Близнецы": "gemini",
    "Рак": "cancer",
    "Лев": "leo",
    "Дева": "virgo",
    "Весы": "libra",
    "Скорпион": "scorpio",
    "Стрелец": "sagittarius",
    "Козерог": "capricorn",
    "Водолей": "aquarius",
    "Рыбы": "pisces",
}


class TraitNotFound(Exception):
    pass


class InvalidStatus(Exception):
    pass


class QuestionNotFound(Exception):
    pass


class PromiseNotFound(Exception):
    pass


class NoGuestPending(Exception):
    pass


async def get_state(session: AsyncSession, contest_id: int) -> dict:
    row = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == contest_id)
        )
    ).scalar_one_or_none()
    if row is None:
        return {
            "contest_id": contest_id,
            "status": "not_started",
            "active_step": {},
        }
    return {
        "contest_id": row.contest_id,
        "status": row.status.value,
        "active_step": row.active_step or {},
    }


async def set_status(
    session: AsyncSession, contest_id: int, status: str
) -> dict:
    try:
        new_status = ContestStatus(status)
    except ValueError:
        raise InvalidStatus()
    row = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == contest_id)
        )
    ).scalar_one_or_none()
    if row is None:
        row = ContestState(contest_id=contest_id, status=new_status)
        session.add(row)
    else:
        row.status = new_status
    await session.commit()
    return await get_state(session, contest_id)


async def list_all_states(session: AsyncSession) -> List[dict]:
    rows = (
        await session.execute(
            select(ContestState).order_by(ContestState.contest_id)
        )
    ).scalars().all()
    return [
        {
            "contest_id": r.contest_id,
            "status": r.status.value,
            "active_step": r.active_step or {},
        }
        for r in rows
    ]


# -------- Contest 1 --------


async def contest1_overview(session: AsyncSession) -> dict:
    state = await get_state(session, 1)
    traits = (
        await session.execute(
            select(Contest1Trait).order_by(Contest1Trait.order_index)
        )
    ).scalars().all()
    tallies = {
        t.trait_id: t
        for t in (
            await session.execute(select(Contest1VoteTally))
        ).scalars().all()
    }
    items: List[dict] = []
    for tr in traits:
        ta = tallies.get(tr.id)
        items.append(
            {
                "id": tr.id,
                "order_index": tr.order_index,
                "name": tr.name,
                "votes_mom": ta.votes_mom if ta else 0,
                "votes_dad": ta.votes_dad if ta else 0,
                "votes_unique": ta.votes_unique if ta else 0,
                "votes_relatives": ta.votes_relatives if ta else [],
            }
        )
    return {"state": state, "traits": items, "summary": _summary(items)}


def _summary(items: List[dict]) -> dict:
    """Aggregate winner across all traits."""
    totals = {"mom": 0, "dad": 0, "unique": 0, "relatives": {}}
    for it in items:
        totals["mom"] += it["votes_mom"]
        totals["dad"] += it["votes_dad"]
        totals["unique"] += it["votes_unique"]
        for r in it["votes_relatives"]:
            name = r.get("name", "").strip()
            cnt = int(r.get("count", 0))
            if not name or cnt <= 0:
                continue
            totals["relatives"][name] = totals["relatives"].get(name, 0) + cnt

    relatives_total = sum(totals["relatives"].values())
    top_relative_name = None
    top_relative_count = 0
    for n, c in totals["relatives"].items():
        if c > top_relative_count:
            top_relative_count = c
            top_relative_name = n

    bucket_counts = {
        "mom": totals["mom"],
        "dad": totals["dad"],
        "unique": totals["unique"],
        "relatives": relatives_total,
    }
    leader = max(bucket_counts, key=bucket_counts.get) if any(bucket_counts.values()) else None
    if leader == "mom":
        verdict = "Мама фейс"
    elif leader == "dad":
        verdict = "Папа фейс"
    elif leader == "unique":
        verdict = "Сама уникальность"
    elif leader == "relatives" and top_relative_name:
        verdict = f"В кого-то из родни — {top_relative_name}"
    else:
        verdict = None
    return {
        "totals": {
            "mom": totals["mom"],
            "dad": totals["dad"],
            "unique": totals["unique"],
            "relatives": relatives_total,
        },
        "top_relative_name": top_relative_name,
        "top_relative_count": top_relative_count,
        "verdict": verdict,
    }


async def contest1_set_tally(
    session: AsyncSession,
    *,
    trait_id: int,
    votes_mom: Optional[int] = None,
    votes_dad: Optional[int] = None,
    votes_unique: Optional[int] = None,
    votes_relatives: Optional[List[Dict[str, Any]]] = None,
) -> dict:
    trait = (
        await session.execute(
            select(Contest1Trait).where(Contest1Trait.id == trait_id)
        )
    ).scalar_one_or_none()
    if trait is None:
        raise TraitNotFound()
    tally = (
        await session.execute(
            select(Contest1VoteTally).where(
                Contest1VoteTally.trait_id == trait_id
            )
        )
    ).scalar_one_or_none()
    if tally is None:
        tally = Contest1VoteTally(trait_id=trait_id)
        session.add(tally)
    if votes_mom is not None:
        tally.votes_mom = max(0, int(votes_mom))
    if votes_dad is not None:
        tally.votes_dad = max(0, int(votes_dad))
    if votes_unique is not None:
        tally.votes_unique = max(0, int(votes_unique))
    if votes_relatives is not None:
        cleaned = []
        for r in votes_relatives:
            name = (r.get("name") or "").strip()
            try:
                cnt = max(0, int(r.get("count", 0)))
            except (TypeError, ValueError):
                cnt = 0
            if name and cnt > 0:
                cleaned.append({"name": name, "count": cnt})
        tally.votes_relatives = cleaned
    await session.commit()
    return {
        "trait_id": trait_id,
        "votes_mom": tally.votes_mom,
        "votes_dad": tally.votes_dad,
        "votes_unique": tally.votes_unique,
        "votes_relatives": tally.votes_relatives,
    }


async def contest1_reset(session: AsyncSession) -> None:
    """Zero all tallies (admin only — for re-runs)."""
    tallies = (
        await session.execute(select(Contest1VoteTally))
    ).scalars().all()
    for t in tallies:
        t.votes_mom = 0
        t.votes_dad = 0
        t.votes_unique = 0
        t.votes_relatives = []
    await session.commit()


# -------- Contest 2: «Знаете ли вы» --------


async def contest2_overview(session: AsyncSession, *, reveal: bool = True) -> dict:
    """Returns full contest 2 state.

    `reveal` controls whether `correct_index` is exposed to the caller.
    Host always sees it; projector view follows active_step (only the
    currently active answer is revealed mid-game)."""
    state = await get_state(session, 2)
    questions = (
        await session.execute(
            select(Contest2Question).order_by(Contest2Question.order_index)
        )
    ).scalars().all()
    firsts = {
        f.question_id: f
        for f in (
            await session.execute(select(Contest2FirstCorrect))
        ).scalars().all()
    }

    items: List[dict] = []
    for q in questions:
        f = firsts.get(q.id)
        items.append(
            {
                "id": q.id,
                "order_index": q.order_index,
                "text": q.text,
                "options": q.options,
                "correct_index": q.correct_index if reveal else None,
                "first_correct_name": f.guest_name if f else None,
                "first_correct_guest_id": str(f.guest_id) if f and f.guest_id else None,
            }
        )

    # Leaderboard — count of firsts by name.
    tally: Dict[str, int] = {}
    for f in firsts.values():
        name = (f.guest_name or "").strip()
        if name:
            tally[name] = tally.get(name, 0) + 1
    leaderboard = sorted(
        ({"name": n, "wins": c} for n, c in tally.items()),
        key=lambda x: (-x["wins"], x["name"]),
    )
    winner_name = leaderboard[0]["name"] if leaderboard else None

    return {
        "state": state,
        "questions": items,
        "leaderboard": leaderboard,
        "winner_name": winner_name,
        "answered": sum(1 for it in items if it["first_correct_name"]),
        "total": len(items),
    }


async def contest2_set_active(
    session: AsyncSession, *, question_id: Optional[int], show_answer: bool
) -> dict:
    """Update what is currently shown on projector."""
    row = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 2)
        )
    ).scalar_one_or_none()
    if row is None:
        row = ContestState(contest_id=2)
        session.add(row)
    if question_id is not None:
        q = (
            await session.execute(
                select(Contest2Question).where(Contest2Question.id == question_id)
            )
        ).scalar_one_or_none()
        if q is None:
            raise QuestionNotFound()
    row.active_step = {
        "question_id": question_id,
        "show_answer": bool(show_answer),
    }
    await session.commit()
    return await get_state(session, 2)


async def contest2_set_first_correct(
    session: AsyncSession,
    *,
    question_id: int,
    guest_id: Optional[uuid.UUID] = None,
    guest_name: Optional[str] = None,
) -> dict:
    q = (
        await session.execute(
            select(Contest2Question).where(Contest2Question.id == question_id)
        )
    ).scalar_one_or_none()
    if q is None:
        raise QuestionNotFound()

    # Resolve guest_id → name (canonical) if given
    if guest_id is not None and not guest_name:
        g = (
            await session.execute(select(Guest).where(Guest.id == guest_id))
        ).scalar_one_or_none()
        if g is not None:
            guest_name = g.name

    name = (guest_name or "").strip() or None

    row = (
        await session.execute(
            select(Contest2FirstCorrect).where(
                Contest2FirstCorrect.question_id == question_id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = Contest2FirstCorrect(
            question_id=question_id, guest_id=guest_id, guest_name=name
        )
        session.add(row)
    else:
        row.guest_id = guest_id
        row.guest_name = name
    await session.commit()
    return {
        "question_id": question_id,
        "guest_id": str(guest_id) if guest_id else None,
        "guest_name": name,
    }


async def contest2_clear_first_correct(
    session: AsyncSession, *, question_id: int
) -> None:
    row = (
        await session.execute(
            select(Contest2FirstCorrect).where(
                Contest2FirstCorrect.question_id == question_id
            )
        )
    ).scalar_one_or_none()
    if row is not None:
        await session.delete(row)
        await session.commit()


async def contest2_reset(session: AsyncSession) -> None:
    """Clear all winners and active step (for re-runs)."""
    firsts = (
        await session.execute(select(Contest2FirstCorrect))
    ).scalars().all()
    for f in firsts:
        await session.delete(f)
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 2)
        )
    ).scalar_one_or_none()
    if state is not None:
        state.active_step = {}
    await session.commit()


# -------- Contest 3: «50 обещаний» --------


async def contest3_admin_overview(session: AsyncSession) -> dict:
    """Admin view — never reveals which promise belongs to which guest.

    Returns aggregated counters (assigned / read / total) and pacing info so the
    host knows what's left without spoiling who gets what."""
    state = await get_state(session, 3)
    promises = (
        await session.execute(select(Contest3Promise))
    ).scalars().all()
    guests_count = (
        await session.execute(select(Guest))
    ).scalars().all()

    assigned = [p for p in promises if p.assigned_guest_id is not None]
    read = [p for p in assigned if p.read_aloud_at is not None]

    assigned_guests = {p.assigned_guest_id for p in assigned}
    read_guest_ids = {
        p.assigned_guest_id for p in read
    }
    # A guest is "done" only when ALL their assigned promises have been read.
    by_guest_read: Dict[uuid.UUID, int] = {}
    by_guest_total: Dict[uuid.UUID, int] = {}
    for p in assigned:
        by_guest_total[p.assigned_guest_id] = (
            by_guest_total.get(p.assigned_guest_id, 0) + 1
        )
        if p.read_aloud_at is not None:
            by_guest_read[p.assigned_guest_id] = (
                by_guest_read.get(p.assigned_guest_id, 0) + 1
            )
    done_guests = sum(
        1
        for gid, t in by_guest_total.items()
        if by_guest_read.get(gid, 0) >= t
    )

    return {
        "state": state,
        "total_promises": len(promises),
        "assigned_total": len(assigned),
        "read_total": len(read),
        "guests_total": len(guests_count),
        "guests_with_assignments": len(assigned_guests),
        "guests_done": done_guests,
    }


async def contest3_assign_random(
    session: AsyncSession, *, per_guest: int = 2
) -> dict:
    """Shuffle promises and assign N to each guest. Idempotent: clears any
    previous assignment first. Lefovers stay in the pool with NULL guest."""
    # Reset state
    all_promises = (
        await session.execute(select(Contest3Promise))
    ).scalars().all()
    for p in all_promises:
        p.assigned_guest_id = None
        p.read_aloud_at = None
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 3)
        )
    ).scalar_one_or_none()
    if state is not None:
        state.active_step = {}

    guests = (
        await session.execute(select(Guest).order_by(Guest.created_at))
    ).scalars().all()
    pool = list(all_promises)
    random.shuffle(pool)

    i = 0
    for g in guests:
        for _ in range(per_guest):
            if i >= len(pool):
                break
            pool[i].assigned_guest_id = g.id
            i += 1

    await session.commit()
    return await contest3_admin_overview(session)


async def contest3_pick_next(session: AsyncSession) -> dict:
    """Return a random guest whose assignments are NOT fully read, with their
    promises. Sets active_step so the projector shows them."""
    assigned = (
        await session.execute(
            select(Contest3Promise).where(
                Contest3Promise.assigned_guest_id.is_not(None)
            )
        )
    ).scalars().all()
    by_guest: Dict[uuid.UUID, List[Contest3Promise]] = {}
    for p in assigned:
        by_guest.setdefault(p.assigned_guest_id, []).append(p)

    pending_guest_ids = [
        gid for gid, ps in by_guest.items() if any(p.read_aloud_at is None for p in ps)
    ]
    if not pending_guest_ids:
        raise NoGuestPending()

    next_gid = random.choice(pending_guest_ids)
    row = (
        await session.execute(
            select(Guest, Avatar)
            .join(Avatar, Avatar.id == Guest.avatar_id)
            .where(Guest.id == next_gid)
        )
    ).first()
    guest, avatar = row
    promise_ids = [p.id for p in by_guest[next_gid]]

    # Pin into active_step so projector shows the same set.
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 3)
        )
    ).scalar_one_or_none()
    if state is None:
        state = ContestState(contest_id=3)
        session.add(state)
    state.active_step = {
        "guest_id": str(guest.id),
        "promise_ids": promise_ids,
    }
    await session.commit()

    return {
        "guest_id": str(guest.id),
        "guest_name": guest.name,
        "avatar_url": avatar.image_url,
        "avatar_name": avatar.name,
        "promises": [
            {
                "id": p.id,
                "text": p.text,
                "read_aloud_at": p.read_aloud_at.isoformat()
                if p.read_aloud_at
                else None,
            }
            for p in by_guest[next_gid]
        ],
    }


async def contest3_mark_read(
    session: AsyncSession, *, promise_ids: List[int]
) -> None:
    if not promise_ids:
        return
    rows = (
        await session.execute(
            select(Contest3Promise).where(Contest3Promise.id.in_(promise_ids))
        )
    ).scalars().all()
    now = datetime.now(timezone.utc)
    for p in rows:
        p.read_aloud_at = now
    await session.commit()


async def contest3_clear_active(session: AsyncSession) -> None:
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 3)
        )
    ).scalar_one_or_none()
    if state is not None:
        state.active_step = {}
        await session.commit()


async def contest3_projector_view(session: AsyncSession) -> dict:
    """What the projector shows. Either nothing (idle) or the current guest's
    full reveal."""
    state = await get_state(session, 3)
    step = state["active_step"] or {}
    guest_id_str = step.get("guest_id")
    if not guest_id_str:
        return {"state": state, "current": None}
    try:
        guest_id = uuid.UUID(guest_id_str)
    except ValueError:
        return {"state": state, "current": None}
    row = (
        await session.execute(
            select(Guest, Avatar)
            .join(Avatar, Avatar.id == Guest.avatar_id)
            .where(Guest.id == guest_id)
        )
    ).first()
    if row is None:
        return {"state": state, "current": None}
    guest, avatar = row
    promise_ids = step.get("promise_ids") or []
    promises = (
        await session.execute(
            select(Contest3Promise).where(Contest3Promise.id.in_(promise_ids))
        )
    ).scalars().all()
    promises_sorted = sorted(promises, key=lambda p: p.id)
    return {
        "state": state,
        "current": {
            "guest_id": str(guest.id),
            "guest_name": guest.name,
            "avatar_url": avatar.image_url,
            "avatar_name": avatar.name,
            "promises": [
                {
                    "id": p.id,
                    "text": p.text,
                    "read_aloud_at": p.read_aloud_at.isoformat()
                    if p.read_aloud_at
                    else None,
                }
                for p in promises_sorted
            ],
        },
    }


async def contest3_reset(session: AsyncSession) -> None:
    promises = (
        await session.execute(select(Contest3Promise))
    ).scalars().all()
    for p in promises:
        p.assigned_guest_id = None
        p.read_aloud_at = None
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 3)
        )
    ).scalar_one_or_none()
    if state is not None:
        state.active_step = {}
    await session.commit()


async def contest3_all_promises_for_pdf(
    session: AsyncSession,
) -> List[str]:
    rows = (
        await session.execute(
            select(Contest3Promise).order_by(Contest3Promise.id)
        )
    ).scalars().all()
    return [p.text for p in rows]


# -------- Contest 4: «Знак зодиака» --------


_ZODIAC_ORDER = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]


async def contest4_overview(session: AsyncSession) -> dict:
    """Overview for host: 12 zodiacs, their traits, list of guests in each,
    plus current active step (which zodiac is on the projector)."""
    state = await get_state(session, 4)
    rows = (
        await session.execute(
            select(ZodiacTraitTemplate).order_by(
                ZodiacTraitTemplate.zodiac_key,
                ZodiacTraitTemplate.order_index,
            )
        )
    ).scalars().all()

    by_key: Dict[str, dict] = {}
    for r in rows:
        z = by_key.setdefault(
            r.zodiac_key,
            {
                "key": r.zodiac_key,
                "name": r.zodiac_name,
                "glyph": r.glyph,
                "traits": [],
                "guests": [],
            },
        )
        z["traits"].append({"order_index": r.order_index, "text": r.trait_text})

    # Compute guests per zodiac from their birth_date
    guests = (
        await session.execute(
            select(Guest, Avatar)
            .join(Avatar, Avatar.id == Guest.avatar_id)
            .order_by(Guest.name)
        )
    ).all()
    for g, av in guests:
        name = western_zodiac(g.birth_date)
        key = _ZODIAC_NAME_TO_KEY.get(name)
        if key and key in by_key:
            by_key[key]["guests"].append(
                {
                    "id": str(g.id),
                    "name": g.name,
                    "avatar_url": av.image_url,
                    "avatar_name": av.name,
                }
            )

    # Preserve canonical zodiac order
    zodiacs = [by_key[k] for k in _ZODIAC_ORDER if k in by_key]
    return {"state": state, "zodiacs": zodiacs}


async def contest4_set_active(
    session: AsyncSession, *, zodiac_key: Optional[str]
) -> dict:
    if zodiac_key is not None and zodiac_key not in _ZODIAC_ORDER:
        raise ValueError("unknown zodiac")
    row = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 4)
        )
    ).scalar_one_or_none()
    if row is None:
        row = ContestState(contest_id=4)
        session.add(row)
    row.active_step = {"zodiac_key": zodiac_key} if zodiac_key else {}
    await session.commit()
    return await get_state(session, 4)


async def contest4_projector_view(session: AsyncSession) -> dict:
    state = await get_state(session, 4)
    step = state["active_step"] or {}
    zk = step.get("zodiac_key")
    if not zk:
        return {"state": state, "current": None}
    rows = (
        await session.execute(
            select(ZodiacTraitTemplate)
            .where(ZodiacTraitTemplate.zodiac_key == zk)
            .order_by(ZodiacTraitTemplate.order_index)
        )
    ).scalars().all()
    if not rows:
        return {"state": state, "current": None}
    z = rows[0]

    # List guests for this zodiac
    guests_rows = (
        await session.execute(
            select(Guest, Avatar)
            .join(Avatar, Avatar.id == Guest.avatar_id)
            .order_by(Guest.name)
        )
    ).all()
    matched = []
    for g, av in guests_rows:
        if _ZODIAC_NAME_TO_KEY.get(western_zodiac(g.birth_date)) == zk:
            matched.append(
                {
                    "id": str(g.id),
                    "name": g.name,
                    "avatar_url": av.image_url,
                    "avatar_name": av.name,
                }
            )

    return {
        "state": state,
        "current": {
            "key": z.zodiac_key,
            "name": z.zodiac_name,
            "glyph": z.glyph,
            "traits": [r.trait_text for r in rows],
            "guests": matched,
        },
    }


async def contest4_traits_for_pdf(
    session: AsyncSession, zodiac_key: str
) -> Optional[dict]:
    rows = (
        await session.execute(
            select(ZodiacTraitTemplate)
            .where(ZodiacTraitTemplate.zodiac_key == zodiac_key)
            .order_by(ZodiacTraitTemplate.order_index)
        )
    ).scalars().all()
    if not rows:
        return None
    return {
        "key": rows[0].zodiac_key,
        "name": rows[0].zodiac_name,
        "glyph": rows[0].glyph,
        "traits": [r.trait_text for r in rows],
    }


class TeamNotFound(Exception):
    pass


# -------- Contest 5: «Своя игра» --------


async def contest5_overview(
    session: AsyncSession, *, reveal_answers: bool = True
) -> dict:
    """Overview for host: full state with categories, questions, teams,
    active question, final question reveal status."""
    state = await get_state(session, 5)
    categories = (
        await session.execute(
            select(Contest5Category).order_by(Contest5Category.order_index)
        )
    ).scalars().all()
    questions = (
        await session.execute(select(Contest5Question))
    ).scalars().all()
    teams = (
        await session.execute(
            select(Contest5Team).order_by(Contest5Team.order_index)
        )
    ).scalars().all()
    final = (
        await session.execute(select(Contest5Final).where(Contest5Final.id == 1))
    ).scalar_one_or_none()

    by_cat: Dict[int, List[Contest5Question]] = {}
    for q in questions:
        by_cat.setdefault(q.category_id, []).append(q)

    cat_views = []
    for cat in categories:
        cell_list = sorted(by_cat.get(cat.id, []), key=lambda x: x.value)
        cat_views.append(
            {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "order_index": cat.order_index,
                "questions": [
                    {
                        "id": q.id,
                        "value": q.value,
                        "answered_status": q.answered_status,
                        "answered_team_id": q.answered_team_id,
                        # Hide text/answer here — projector fetches them only
                        # when a question is active.
                        "text": q.text if reveal_answers else None,
                        "answer": q.answer if reveal_answers else None,
                        "image_key": q.image_key,
                    }
                    for q in cell_list
                ],
            }
        )

    return {
        "state": state,
        "categories": cat_views,
        "teams": [
            {
                "id": t.id,
                "name": t.name,
                "color": t.color,
                "score": t.score,
                "final_wager": t.final_wager,
                "final_correct": t.final_correct,
                "order_index": t.order_index,
            }
            for t in teams
        ],
        "final": {
            "text": final.text if (final and reveal_answers) else None,
            "answer": final.answer if (final and reveal_answers and final.revealed) else None,
            "revealed": bool(final and final.revealed),
        }
        if final
        else None,
    }


def _active_question_id(state: dict) -> Optional[int]:
    step = state.get("active_step") or {}
    v = step.get("question_id")
    return int(v) if isinstance(v, int) else None


def _show_answer(state: dict) -> bool:
    step = state.get("active_step") or {}
    return bool(step.get("show_answer"))


def _final_active(state: dict) -> bool:
    step = state.get("active_step") or {}
    return bool(step.get("final"))


async def contest5_projector_view(session: AsyncSession) -> dict:
    state = await get_state(session, 5)
    overview = await contest5_overview(session, reveal_answers=False)
    qid = _active_question_id(state)
    final_on = _final_active(state)
    active_q = None
    final_q = None

    if qid is not None:
        q = (
            await session.execute(
                select(Contest5Question, Contest5Category)
                .join(Contest5Category, Contest5Category.id == Contest5Question.category_id)
                .where(Contest5Question.id == qid)
            )
        ).first()
        if q is not None:
            qrow, crow = q
            active_q = {
                "id": qrow.id,
                "category_name": crow.name,
                "value": qrow.value,
                "text": qrow.text,
                "answer": qrow.answer if _show_answer(state) else None,
                "image_key": qrow.image_key,
            }

    if final_on:
        f = (
            await session.execute(select(Contest5Final).where(Contest5Final.id == 1))
        ).scalar_one_or_none()
        if f is not None:
            final_q = {
                "text": f.text,
                "answer": f.answer if f.revealed else None,
                "revealed": f.revealed,
            }

    overview["active_question"] = active_q
    overview["final_active"] = final_on
    overview["final_question"] = final_q
    return overview


async def contest5_open_question(
    session: AsyncSession, *, question_id: int
) -> dict:
    q = (
        await session.execute(
            select(Contest5Question).where(Contest5Question.id == question_id)
        )
    ).scalar_one_or_none()
    if q is None:
        raise QuestionNotFound()
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 5)
        )
    ).scalar_one_or_none()
    if state is None:
        state = ContestState(contest_id=5)
        session.add(state)
    state.active_step = {
        "question_id": question_id,
        "show_answer": False,
        "final": False,
    }
    await session.commit()
    return await contest5_overview(session)


async def contest5_show_answer(session: AsyncSession) -> dict:
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 5)
        )
    ).scalar_one_or_none()
    if state is None:
        return await contest5_overview(session)
    step = dict(state.active_step or {})
    step["show_answer"] = True
    state.active_step = step
    await session.commit()
    return await contest5_overview(session)


async def contest5_resolve(
    session: AsyncSession,
    *,
    question_id: int,
    team_id: Optional[int],
    correct: bool,
) -> dict:
    q = (
        await session.execute(
            select(Contest5Question).where(Contest5Question.id == question_id)
        )
    ).scalar_one_or_none()
    if q is None:
        raise QuestionNotFound()

    # Reverse previous resolution if re-resolving the same question.
    if q.answered_status in ("correct", "wrong") and q.answered_team_id is not None:
        prev = (
            await session.execute(
                select(Contest5Team).where(Contest5Team.id == q.answered_team_id)
            )
        ).scalar_one_or_none()
        if prev is not None:
            if q.answered_status == "correct":
                prev.score -= q.value
            else:
                prev.score += q.value

    if team_id is not None:
        t = (
            await session.execute(
                select(Contest5Team).where(Contest5Team.id == team_id)
            )
        ).scalar_one_or_none()
        if t is None:
            raise TeamNotFound()
        if correct:
            t.score += q.value
            q.answered_status = "correct"
        else:
            t.score -= q.value
            q.answered_status = "wrong"
        q.answered_team_id = team_id
    else:
        # No team — skipped
        q.answered_status = "skipped"
        q.answered_team_id = None

    await session.commit()
    return await contest5_overview(session)


async def contest5_close_active(session: AsyncSession) -> dict:
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 5)
        )
    ).scalar_one_or_none()
    if state is not None:
        state.active_step = {}
        await session.commit()
    return await contest5_overview(session)


async def contest5_update_team(
    session: AsyncSession,
    *,
    team_id: int,
    name: Optional[str] = None,
    color: Optional[str] = None,
    score: Optional[int] = None,
    final_wager: Optional[int] = None,
    final_correct: Optional[bool] = None,
) -> dict:
    t = (
        await session.execute(select(Contest5Team).where(Contest5Team.id == team_id))
    ).scalar_one_or_none()
    if t is None:
        raise TeamNotFound()
    if name is not None and name.strip():
        t.name = name.strip()
    if color is not None and color.strip():
        t.color = color.strip()
    if score is not None:
        t.score = int(score)
    if final_wager is not None:
        t.final_wager = max(0, int(final_wager))
    if final_correct is not None:
        t.final_correct = bool(final_correct)
    await session.commit()
    return await contest5_overview(session)


async def contest5_open_final(session: AsyncSession) -> dict:
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 5)
        )
    ).scalar_one_or_none()
    if state is None:
        state = ContestState(contest_id=5)
        session.add(state)
    state.active_step = {"final": True, "show_answer": False, "question_id": None}
    await session.commit()
    return await contest5_overview(session)


async def contest5_reveal_final(session: AsyncSession) -> dict:
    f = (
        await session.execute(select(Contest5Final).where(Contest5Final.id == 1))
    ).scalar_one_or_none()
    if f is not None:
        f.revealed = True
        await session.commit()
    return await contest5_overview(session)


async def contest5_resolve_final(
    session: AsyncSession,
) -> dict:
    """Apply each team's final_wager based on their final_correct flag."""
    teams = (await session.execute(select(Contest5Team))).scalars().all()
    for t in teams:
        if t.final_correct is True:
            t.score += t.final_wager
        elif t.final_correct is False:
            t.score -= t.final_wager
    await session.commit()
    return await contest5_overview(session)


async def contest5_reset(session: AsyncSession) -> dict:
    """Reset all answered statuses, scores, wagers; clear active state."""
    questions = (await session.execute(select(Contest5Question))).scalars().all()
    for q in questions:
        q.answered_status = "unanswered"
        q.answered_team_id = None
    teams = (await session.execute(select(Contest5Team))).scalars().all()
    for t in teams:
        t.score = 0
        t.final_wager = 0
        t.final_correct = None
    f = (
        await session.execute(select(Contest5Final).where(Contest5Final.id == 1))
    ).scalar_one_or_none()
    if f is not None:
        f.revealed = False
    state = (
        await session.execute(
            select(ContestState).where(ContestState.contest_id == 5)
        )
    ).scalar_one_or_none()
    if state is not None:
        state.active_step = {}
    await session.commit()
    return await contest5_overview(session)


async def contest4_all_zodiacs_for_pdf(session: AsyncSession) -> List[dict]:
    rows = (
        await session.execute(
            select(ZodiacTraitTemplate).order_by(
                ZodiacTraitTemplate.zodiac_key,
                ZodiacTraitTemplate.order_index,
            )
        )
    ).scalars().all()
    by_key: Dict[str, dict] = {}
    for r in rows:
        z = by_key.setdefault(
            r.zodiac_key,
            {"key": r.zodiac_key, "name": r.zodiac_name, "glyph": r.glyph, "traits": []},
        )
        z["traits"].append(r.trait_text)
    return [by_key[k] for k in _ZODIAC_ORDER if k in by_key]
