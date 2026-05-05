"""Telegram bot setup. Implementation lands in subsequent steps.

Will register handlers for:
  /start <code>     — bind Telegram account to a guest or admin
  /start            — welcome + instructions to get a code in LK

Notifications are sent via the Bot instance from elsewhere in the app
(bookings, RSVP changes, video moderation, game results, etc.).
"""

from typing import Optional

from aiogram import Bot, Dispatcher

from app.config import get_settings


def build_bot() -> Optional[Bot]:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return None
    return Bot(token=settings.telegram_bot_token)


def build_dispatcher() -> Dispatcher:
    return Dispatcher()
