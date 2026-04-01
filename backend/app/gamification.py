"""
LearnForge — Gamification engine: XP, streaks, achievements.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Achievement,
    User,
    UserAchievement,
    UserProgress,
)


async def award_xp(db: AsyncSession, user: User, points: int) -> int:
    """Add XP to a user. Returns the new total."""
    user.xp_total = (user.xp_total or 0) + points
    db.add(user)
    await db.flush()
    return int(user.xp_total)


async def update_streak(db: AsyncSession, user: User) -> int:
    """Update the user's daily streak. Call on every section completion."""
    today = date.today()
    last = user.last_active_date.date() if user.last_active_date else None

    if last == today:
        return int(user.current_streak)  # Already active today

    if last and (today - last).days == 1:
        user.current_streak = (user.current_streak or 0) + 1
    elif last and (today - last).days > 1:
        user.current_streak = 1  # Streak broken
    else:
        user.current_streak = 1  # First ever activity

    if user.current_streak > (user.longest_streak or 0):
        user.longest_streak = user.current_streak

    user.last_active_date = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()
    return int(user.current_streak)


async def evaluate_achievements(db: AsyncSession, user: User) -> List[str]:
    """
    Check all achievement criteria against the user's state.
    Returns list of newly-unlocked achievement names.
    """
    # Fetch all achievements
    result = await db.execute(select(Achievement))
    all_achievements = result.scalars().all()

    # Fetch user's already-unlocked achievement IDs
    result = await db.execute(
        select(UserAchievement.achievement_id).where(UserAchievement.user_id == user.id)
    )
    unlocked_ids = {row for row in result.scalars().all()}

    # Count completed sections
    result = await db.execute(
        select(func.count())
        .select_from(UserProgress)
        .where(UserProgress.user_id == user.id, UserProgress.completed == True)  # noqa: E712
    )
    completed_count = result.scalar() or 0

    # NOTE: Completed-paths achievement check can be added later
    # when a "paths_completed" criteria type is needed.

    newly_unlocked: List[str] = []

    for achievement in all_achievements:
        if achievement.id in unlocked_ids:
            continue

        criteria = achievement.criteria
        rule_type = criteria.get("type")
        value = criteria.get("value", 0)
        unlocked = False

        if rule_type == "streak" and user.current_streak >= value:
            unlocked = True
        elif rule_type == "xp_milestone" and user.xp_total >= value:
            unlocked = True
        elif rule_type == "sections_completed" and completed_count >= value:
            unlocked = True
        elif rule_type == "first_quiz":
            unlocked = completed_count >= 1

        if unlocked:
            ua = UserAchievement(user_id=user.id, achievement_id=achievement.id)
            db.add(ua)
            newly_unlocked.append(achievement.name)

    if newly_unlocked:
        await db.flush()

    return newly_unlocked


# ── Default achievements to seed ─────────────────────────────

DEFAULT_ACHIEVEMENTS = [
    {"name": "First Steps", "description": "Complete your first quiz question", "icon": "🎯", "criteria": {"type": "first_quiz"}},
    {"name": "Getting Started", "description": "Complete 10 sections", "icon": "📚", "criteria": {"type": "sections_completed", "value": 10}},
    {"name": "Dedicated Learner", "description": "Complete 50 sections", "icon": "🎓", "criteria": {"type": "sections_completed", "value": 50}},
    {"name": "Century", "description": "Complete 100 sections", "icon": "💯", "criteria": {"type": "sections_completed", "value": 100}},
    {"name": "On Fire", "description": "Maintain a 3-day streak", "icon": "🔥", "criteria": {"type": "streak", "value": 3}},
    {"name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "⚔️", "criteria": {"type": "streak", "value": 7}},
    {"name": "Unstoppable", "description": "Maintain a 30-day streak", "icon": "🚀", "criteria": {"type": "streak", "value": 30}},
    {"name": "XP Collector", "description": "Earn 500 XP total", "icon": "⭐", "criteria": {"type": "xp_milestone", "value": 500}},
    {"name": "XP Hunter", "description": "Earn 2000 XP total", "icon": "🌟", "criteria": {"type": "xp_milestone", "value": 2000}},
    {"name": "XP Legend", "description": "Earn 10000 XP total", "icon": "👑", "criteria": {"type": "xp_milestone", "value": 10000}},
]
