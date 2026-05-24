"""Family media stored on the projector laptop filesystem.

Files are written to `frontend/public/family/` so Next serves them directly
at `/family/<filename>`. This is a LOCAL-ONLY feature for the offline
projector setup — Railway production has ephemeral filesystem and is not
expected to persist uploads.
"""
from __future__ import annotations

import re
import time
import unicodedata
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.family_media import FamilyMedia


# Resolves to <repo>/frontend/public/family from any cwd.
MEDIA_DIR = (
    Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "public" / "family"
)

PHOTO_EXT = {".jpg", ".jpeg", ".png", ".heic", ".webp", ".gif"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v"}
MUSIC_EXT = {".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"}


def _safe_filename(original: str) -> str:
    """Strip extension, slugify, add timestamp so collisions don't overwrite."""
    p = Path(original)
    stem = unicodedata.normalize("NFKD", p.stem).encode("ascii", "ignore").decode()
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", stem).strip("-") or "media"
    return f"{int(time.time() * 1000)}-{stem}{p.suffix.lower()}"


def detect_kind(filename: str) -> str | None:
    ext = Path(filename).suffix.lower()
    if ext in PHOTO_EXT:
        return "photo"
    if ext in VIDEO_EXT:
        return "video"
    if ext in MUSIC_EXT:
        return "music"
    return None


def _serialize(row: FamilyMedia) -> dict[str, Any]:
    return {
        "id": row.id,
        "kind": row.kind,
        "filename": row.filename,
        "url": f"/family/{row.filename}",
        "order_index": row.order_index,
    }


async def list_media(session: AsyncSession) -> list[dict]:
    rows = (
        await session.execute(
            select(FamilyMedia).order_by(FamilyMedia.order_index, FamilyMedia.id)
        )
    ).scalars().all()
    return [_serialize(r) for r in rows]


async def add_media(
    session: AsyncSession, *, original_filename: str, content: bytes
) -> dict:
    kind = detect_kind(original_filename)
    if kind is None:
        raise ValueError("unsupported_file_type")
    filename = _safe_filename(original_filename)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    (MEDIA_DIR / filename).write_bytes(content)

    # New rows go to the end of the carousel.
    max_order = (
        await session.execute(select(FamilyMedia).order_by(FamilyMedia.order_index.desc()))
    ).scalars().first()
    next_index = (max_order.order_index + 1) if max_order else 0

    row = FamilyMedia(kind=kind, filename=filename, order_index=next_index)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _serialize(row)


async def delete_media(session: AsyncSession, media_id: int) -> bool:
    row = (
        await session.execute(select(FamilyMedia).where(FamilyMedia.id == media_id))
    ).scalar_one_or_none()
    if row is None:
        return False
    path = MEDIA_DIR / row.filename
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass  # File missing or unreadable — DB row still removed.
    await session.delete(row)
    await session.commit()
    return True


async def reorder_media(session: AsyncSession, ids: list[int]) -> list[dict]:
    rows = (
        await session.execute(select(FamilyMedia))
    ).scalars().all()
    by_id = {r.id: r for r in rows}
    for idx, mid in enumerate(ids):
        if mid in by_id:
            by_id[mid].order_index = idx
    await session.commit()
    return await list_media(session)
