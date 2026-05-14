"""All ORM models. Imported here so they all register on Base.metadata."""

from app.db.models.admin import Admin, AdminRole
from app.db.models.avatar import Avatar
from app.db.models.contest import (
    Contest1Trait,
    Contest1VoteTally,
    ContestState,
    ContestStatus,
)
from app.db.models.event import EventMeta, EventPart, Parent, ParentRole
from app.db.models.game import GameAttempt
from app.db.models.guest import Guest, GuestGender
from app.db.models.rsvp import EventPartType, Rsvp, RsvpStatus
from app.db.models.session import Session, SessionOwnerType
from app.db.models.telegram_binding_code import (
    TelegramBindingCode,
    TelegramBindingCodeOwnerType,
)
from app.db.models.wishlist import Booking, WishlistItem, WishlistPriority

__all__ = [
    "Admin",
    "AdminRole",
    "Avatar",
    "Booking",
    "Contest1Trait",
    "Contest1VoteTally",
    "ContestState",
    "ContestStatus",
    "EventMeta",
    "EventPart",
    "EventPartType",
    "GameAttempt",
    "Guest",
    "GuestGender",
    "Parent",
    "ParentRole",
    "Rsvp",
    "RsvpStatus",
    "Session",
    "SessionOwnerType",
    "TelegramBindingCode",
    "TelegramBindingCodeOwnerType",
    "WishlistItem",
    "WishlistPriority",
]
