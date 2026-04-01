"""
LearnForge — FastAPI application entry-point.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import Base, get_engine

# Import lab models so their tables are created
import app.labs.models  # noqa: F401

# ── Routers ──
from app.routers import admin, auth, code, leaderboard, learn, paths, profile
from app.routers.auth import limiter as auth_limiter
from app.labs.router import router as labs_router

# ── Background tasks ──
from app.labs.cleanup import lab_cleanup_loop

_cleanup_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup; start background lab cleanup loop."""
    global _cleanup_task

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start lab cleanup background task
    _cleanup_task = asyncio.create_task(lab_cleanup_loop())

    yield

    # Shutdown
    if _cleanup_task:
        _cleanup_task.cancel()
        try:
            await _cleanup_task
        except asyncio.CancelledError:
            pass
    await engine.dispose()


app = FastAPI(
    title="LearnForge API",
    description="Cybersecurity training platform — labs, quizzes, coding challenges.",
    version="0.2.0",
    lifespan=lifespan,
)

# ── Rate-limit error handler (slowapi) ──
app.state.limiter = auth_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ──
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(paths.router, prefix="/api/paths", tags=["paths"])
app.include_router(learn.router, prefix="/api/learn", tags=["learn"])
app.include_router(code.router, prefix="/api/code", tags=["code"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(labs_router, prefix="/api/labs", tags=["labs"])


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "learnforge"}
