"""Telegram bot handlers (aiogram 3).

Currently the bot only does the binding flow: on /start <code> it looks up
the one-time code in the DB, binds the guest's telegram_id and username,
and replies with a confirmation.
"""

import logging

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message

from app.db.database import _session_factory
from app.services.telegram_bind import consume_code

log = logging.getLogger(__name__)
router = Router(name="bind")


@router.message(CommandStart(deep_link=True))
async def handle_start_with_code(
    message: Message, command: CommandObject
) -> None:
    code = (command.args or "").strip().upper()
    if not code:
        await _welcome(message)
        return

    if _session_factory is None:
        await message.answer(
            "Сервер ещё не готов. Попробуйте чуть позже."
        )
        return

    async with _session_factory() as session:
        if message.from_user is None:
            return
        guest = await consume_code(
            session,
            code=code,
            telegram_id=message.from_user.id,
            telegram_username=message.from_user.username,
        )

    if guest is None:
        await message.answer(
            "Код не подошёл — он недействителен, истёк или уже использован.\n"
            "Запросите новый код в своём кабинете."
        )
        return

    pronoun = "Госпожа" if guest.gender.value == "F" else "Господин"
    await message.answer(
        f"{pronoun} {guest.name}, аккаунт привязан 🎉\n"
        "Теперь сюда будут приходить уведомления о виш-листе и событиях."
    )


@router.message(CommandStart())
async def handle_start_plain(message: Message) -> None:
    await _welcome(message)


async def _welcome(message: Message) -> None:
    await message.answer(
        "Привет! Это бот мероприятия Амалии.\n\n"
        "Чтобы привязать аккаунт, зайдите на сайт → раздел Telegram → "
        "получите код и пришлите боту команду /start <код>."
    )
