"""Read services for event info + guest list."""

from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Avatar, EventMeta, EventPart, Guest, Parent
from app.services.zodiac import chinese_zodiac, western_zodiac


async def get_event(session: AsyncSession) -> dict:
    meta = (
        await session.execute(select(EventMeta).order_by(EventMeta.id).limit(1))
    ).scalar_one()
    parts = (
        await session.execute(select(EventPart).order_by(EventPart.start_time))
    ).scalars().all()
    parents = (
        await session.execute(select(Parent).order_by(Parent.id))
    ).scalars().all()

    christening = next(
        (p for p in parts if (p.type.value if hasattr(p.type, "value") else p.type) == "christening"),
        None,
    )
    countdown_target = (
        christening.start_time.isoformat() if christening is not None else ""
    )

    return {
        "title": meta.title,
        "dress_code": meta.dress_code,
        "wishes": meta.wishes,
        "countdown_target": countdown_target,
        "parts": [
            {
                "type": p.type.value if hasattr(p.type, "value") else p.type,
                "start_time": p.start_time.isoformat(),
                "address": p.address,
                "yandex_maps_link": p.yandex_maps_link,
                "program": p.program,
            }
            for p in parts
        ],
        "parents": [
            {
                "role": pa.role.value if hasattr(pa.role, "value") else pa.role,
                "name": pa.name,
                "photo_url": pa.photo_url,
                "phone": pa.phone,
                "telegram_username": pa.telegram_username,
            }
            for pa in parents
        ],
    }


async def list_public_guests(session: AsyncSession) -> List[dict]:
    rows = (
        await session.execute(
            select(Guest, Avatar)
            .join(Avatar, Avatar.id == Guest.avatar_id)
            .order_by(Guest.name)
        )
    ).all()
    return [
        {
            "name": g.name,
            "avatar_url": a.image_url,
            "avatar_name": a.name,
            "zodiac": western_zodiac(g.birth_date),
            "chinese_zodiac": chinese_zodiac(g.birth_date),
        }
        for g, a in rows
    ]
