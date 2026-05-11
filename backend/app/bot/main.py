"""Telegram bot wiring. Bot polling runs alongside FastAPI in the
lifespan context (see app.main)."""

import asyncio
import logging
from typing import Optional, Tuple

from aiogram import Bot, Dispatcher

from app.bot.handlers import router as bind_router
from app.config import get_settings

log = logging.getLogger(__name__)


def build_bot() -> Optional[Bot]:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return None
    return Bot(token=settings.telegram_bot_token)


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(bind_router)
    return dp


async def start_polling_task(bot: Bot, dp: Dispatcher) -> asyncio.Task:
    """Return the asyncio.Task running long-polling so the caller can
    cancel it on shutdown."""
    log.info("Starting Telegram bot polling")
    return asyncio.create_task(dp.start_polling(bot, handle_signals=False))


async def shutdown_bot(
    bot: Optional[Bot], task: Optional[asyncio.Task]
) -> None:
    if task is not None:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
    if bot is not None:
        try:
            await bot.session.close()
        except Exception:
            log.exception("Error closing bot session")


def build_bot_and_dp() -> Tuple[Optional[Bot], Optional[Dispatcher]]:
    bot = build_bot()
    if bot is None:
        return None, None
    return bot, build_dispatcher()
