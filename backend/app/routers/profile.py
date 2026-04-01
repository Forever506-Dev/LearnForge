"""
LearnForge — Profile router: view & update user profile.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Achievement, User, UserAchievement
from app.schemas import AchievementOut, ProfileUpdate, UserOut

router = APIRouter()


@router.get("/", response_model=UserOut)
async def get_profile(user: User = Depends(get_current_user)):
    return user


@router.patch("/", response_model=UserOut)
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/achievements", response_model=List[AchievementOut])
async def get_achievements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user.id)
        .options(selectinload(UserAchievement.achievement))
    )
    user_achs = result.scalars().all()

    # Also return locked achievements
    result = await db.execute(select(Achievement))
    all_achs = result.scalars().all()
    unlocked_map = {ua.achievement_id: ua.unlocked_at for ua in user_achs}

    return [
        AchievementOut(
            id=a.id,
            name=a.name,
            description=a.description,
            icon=a.icon,
            unlocked_at=unlocked_map.get(a.id),
        )
        for a in all_achs
    ]
