from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
_engine = create_async_engine(_settings.database_url, echo=False) if _settings.database_url else None
_session_factory = (
    async_sessionmaker(_engine, expire_on_commit=False) if _engine is not None else None
)


async def get_session() -> AsyncIterator[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("DATABASE_URL is not configured")
    async with _session_factory() as session:
        yield session
