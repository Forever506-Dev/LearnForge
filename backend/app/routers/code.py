"""
LearnForge — Code execution router: proxy to Piston.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.gamification import award_xp, evaluate_achievements, update_streak
from app.models import Section, User, UserProgress
from app.schemas import CodeExecuteRequest, CodeExecuteResponse, TestCaseResult

router = APIRouter()
logger = logging.getLogger("code")


@router.post("/execute", response_model=CodeExecuteResponse)
async def execute_code(
    body: CodeExecuteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    logger.info(
        "Code execution request: user_id=%s language=%s section_id=%s",
        user.id, body.language, body.section_id,
    )

    # If a section_id is provided, this is a coding challenge submission
    section = None
    if body.section_id:
        result = await db.execute(select(Section).where(Section.id == body.section_id))
        section = result.scalar_one_or_none()

    # If the section has test cases, run each one
    if section and section.test_cases:
        test_results = []
        passed = 0
        total = len(section.test_cases)

        for tc in section.test_cases:
            piston_resp = await _call_piston(
                settings.PISTON_URL, body.language, body.version, body.code, tc.get("input", "")
            )
            actual_stdout = piston_resp.get("run", {}).get("stdout", "").strip()
            expected = tc.get("expected_output", "").strip()
            is_pass = actual_stdout == expected
            if is_pass:
                passed += 1
            test_results.append(TestCaseResult(
                input=tc.get("input", ""),
                expected=expected,
                actual=actual_stdout,
                passed=is_pass,
            ))

        # Award XP if all tests pass
        xp_earned = 0
        achievements: list[str] = []
        if passed == total and section:
            result = await db.execute(
                select(UserProgress).where(
                    UserProgress.user_id == user.id,
                    UserProgress.section_id == section.id,
                )
            )
            progress = result.scalar_one_or_none()
            if progress is None:
                progress = UserProgress(
                    user_id=user.id, section_id=section.id,
                    completed=True, score=section.points_value,
                    attempts=1, completed_at=datetime.now(timezone.utc),
                )
                db.add(progress)
                xp_earned = section.points_value
            elif not progress.completed:
                progress.completed = True
                progress.score = section.points_value
                progress.completed_at = datetime.now(timezone.utc)
                progress.attempts += 1
                xp_earned = section.points_value
            else:
                progress.attempts += 1

            if xp_earned > 0:
                await award_xp(db, user, xp_earned)
                await update_streak(db, user)
                logger.info(
                    "XP awarded: user_id=%s section_id=%s xp=%d",
                    user.id, section.id, xp_earned,
                )
            achievements = await evaluate_achievements(db, user)
            await db.commit()

        return CodeExecuteResponse(
            stdout=test_results[-1].actual if test_results else "",
            stderr="",
            exit_code=0,
            passed=passed,
            total=total,
            test_results=test_results,
            xp_earned=xp_earned,
            achievements_unlocked=achievements,
        )
    else:
        # Simple execution (no test cases)
        piston_resp = await _call_piston(
            settings.PISTON_URL, body.language, body.version, body.code, body.stdin
        )
        run = piston_resp.get("run", {})
        timed_out = run.get("status") == "TO"

        return CodeExecuteResponse(
            stdout=run.get("stdout", ""),
            stderr=run.get("stderr", ""),
            exit_code=run.get("code", 0) or 0,
            timed_out=timed_out,
        )


async def _call_piston(base_url: str, language: str, version: str, code: str, stdin: str) -> dict:
    """Call the Piston /api/v2/execute endpoint."""
    payload = {
        "language": language,
        "version": version,
        "files": [{"name": "solution", "content": code}],
        "stdin": stdin,
        "run_timeout": 5000,
        "run_memory_limit": 268435456,  # 256 MB
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(f"{base_url}/api/v2/execute", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("Piston returned HTTP %d for language=%s", e.response.status_code, language)
            raise HTTPException(status_code=502, detail="Code runner is unavailable. Please try again.")
        except httpx.HTTPError as e:
            logger.error("Piston connection error: %s", e)
            raise HTTPException(status_code=502, detail="Code runner is unavailable. Please try again.")
