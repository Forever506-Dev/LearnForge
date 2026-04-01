"""
LearnForge — Learn router: get section content, submit answers.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.gamification import award_xp, evaluate_achievements, update_streak
from app.models import Section, User, UserProgress
from app.schemas import SubmitAnswerRequest, SubmitAnswerResponse

router = APIRouter()


@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    body: SubmitAnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch the section
    result = await db.execute(select(Section).where(Section.id == body.section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.content_type.value not in ("quiz",):
        raise HTTPException(status_code=400, detail="This section is not a quiz")

    correct = body.answer.strip().upper() == (section.answer or "").strip().upper()

    # Upsert progress
    result = await db.execute(
        select(UserProgress).where(
            UserProgress.user_id == user.id,
            UserProgress.section_id == section.id,
        )
    )
    progress = result.scalar_one_or_none()

    xp_earned = 0
    if progress is None:
        progress = UserProgress(
            user_id=user.id,
            section_id=section.id,
            completed=correct,
            score=section.points_value if correct else 0,
            attempts=1,
            completed_at=datetime.now(timezone.utc) if correct else None,
        )
        db.add(progress)
        if correct:
            xp_earned = section.points_value
    else:
        progress.attempts += 1
        if correct and not progress.completed:
            progress.completed = True
            progress.score = section.points_value
            progress.completed_at = datetime.now(timezone.utc)
            xp_earned = section.points_value

    if xp_earned > 0:
        await award_xp(db, user, xp_earned)
        await update_streak(db, user)

    achievements = await evaluate_achievements(db, user)
    await db.commit()

    # Refresh user to get updated totals
    await db.refresh(user)

    return SubmitAnswerResponse(
        correct=correct,
        correct_answer=section.answer or "",
        explanation=section.explanation,
        xp_earned=xp_earned,
        new_xp_total=user.xp_total,
        streak=user.current_streak,
        achievements_unlocked=achievements,
    )
