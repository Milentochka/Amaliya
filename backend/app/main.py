import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_auth import router as admin_auth_router
from app.api.admin_data import router as admin_data_router
from app.api.admin_wishlist import router as admin_wishlist_router
from app.api.auth import router as auth_router
from app.api.event import router as event_router
from app.api.family_media import host_router as family_media_host_router
from app.api.family_media import projector_router as family_media_projector_router
from app.api.projector_mode import host_router as projector_mode_host_router
from app.api.projector_mode import projector_router as projector_mode_projector_router
from app.api.game import router as game_router
from app.api.health import router as health_router
from app.api.host import router as host_router
from app.api.projector import router as projector_router
from app.api.wishlist import router as wishlist_router
from app.bot.main import build_bot_and_dp, shutdown_bot, start_polling_task
from app.config import get_settings

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    bot, dp = build_bot_and_dp()
    polling_task = None
    if bot is not None and dp is not None:
        try:
            polling_task = await start_polling_task(bot, dp)
            log.info("Telegram bot polling started")
        except Exception:
            log.exception("Failed to start Telegram bot polling")
    else:
        log.info("Telegram bot token not configured — bot disabled")
    try:
        yield
    finally:
        await shutdown_bot(bot, polling_task)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Amaliya API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.app_frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(admin_auth_router, prefix="/api")
    app.include_router(wishlist_router, prefix="/api")
    app.include_router(admin_wishlist_router, prefix="/api")
    app.include_router(admin_data_router, prefix="/api")
    app.include_router(event_router, prefix="/api")
    app.include_router(game_router, prefix="/api")
    app.include_router(host_router, prefix="/api")
    app.include_router(projector_router, prefix="/api")
    app.include_router(family_media_host_router, prefix="/api")
    app.include_router(family_media_projector_router, prefix="/api")
    app.include_router(projector_mode_host_router, prefix="/api")
    app.include_router(projector_mode_projector_router, prefix="/api")
    return app


app = create_app()
