"""
LearnForge — Leaderboard router (Redis-cached).
"""

from __future__ import annotations

import json
from typing import List

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User, UserAchievement
from app.schemas import LeaderboardEntry

router = APIRouter()

LEADERBOARD_KEY = "learnforge:leaderboard"
LEADERBOARD_TTL = 300  # 5 minutes


@router.get("/", response_model=List[LeaderboardEntry])
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    settings = get_settings()

    # Try Redis cache first
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        cached = await r.get(LEADERBOARD_KEY)
        if cached:
            await r.aclose()
            return json.loads(cached)
    except Exception:
        pass  # Redis down — fall through to DB

    # Query top 50 users by XP
    result = await db.execute(
        select(User)
        .order_by(User.xp_total.desc())
        .limit(50)
    )
    users = result.scalars().all()

    # Batch query achievement counts for all users at once (avoids N+1)
    user_ids = [u.id for u in users]
    ach_counts: dict = {}
    if user_ids:
        ach_result = await db.execute(
            select(UserAchievement.user_id, func.count())
            .where(UserAchievement.user_id.in_(user_ids))
            .group_by(UserAchievement.user_id)
        )
        ach_counts = dict(ach_result.all())

    entries = []
    for rank, u in enumerate(users, start=1):
        entries.append(LeaderboardEntry(
            rank=rank,
            user_id=u.id,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            xp_total=u.xp_total,
            current_streak=u.current_streak,
            achievement_count=ach_counts.get(u.id, 0),
        ))

    # Cache in Redis
    try:
        serializable = [e.model_dump(mode="json") for e in entries]
        await r.set(LEADERBOARD_KEY, json.dumps(serializable), ex=LEADERBOARD_TTL)
    except Exception:
        pass

    await r.aclose()
    return entries
