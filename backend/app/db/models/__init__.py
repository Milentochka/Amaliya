"""All ORM models. Imported here so they all register on Base.metadata."""

from app.db.models.admin import Admin, AdminRole
from app.db.models.avatar import Avatar
from app.db.models.guest import Guest, GuestGender
from app.db.models.rsvp import EventPartType, Rsvp, RsvpStatus
from app.db.models.session import Session, SessionOwnerType
from app.db.models.telegram_binding_code import (
    TelegramBindingCode,
    TelegramBindingCodeOwnerType,
)

__all__ = [
    "Admin",
    "AdminRole",
    "Avatar",
    "EventPartType",
    "Guest",
    "GuestGender",
    "Rsvp",
    "RsvpStatus",
    "Session",
    "SessionOwnerType",
    "TelegramBindingCode",
    "TelegramBindingCodeOwnerType",
]
