"""Contest services (Module 4)."""

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Contest1Trait,
    Contest1VoteTally,
    ContestState,
    ContestStatus,
)


class TraitNotFound(Exception):
    pass


class InvalidStatus(Exception):
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
