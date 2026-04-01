"""
LearnForge — Paths router: list & detail.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_optional_user
from app.database import get_db
from app.models import (
    CategoryEnum,
    DifficultyEnum,
    Module,
    Path,
    Section,
    User,
    UserProgress,
)
from app.schemas import PathDetailOut, PathOut, ModuleOut, SectionOut

router = APIRouter()


@router.get("/", response_model=List[PathOut])
async def list_paths(
    category: Optional[CategoryEnum] = Query(None),
    difficulty: Optional[DifficultyEnum] = Query(None),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Path).order_by(Path.order)
    if category:
        stmt = stmt.where(Path.category == category)
    if difficulty:
        stmt = stmt.where(Path.difficulty == difficulty)

    result = await db.execute(stmt.options(selectinload(Path.modules).selectinload(Module.sections)))
    paths = result.scalars().unique().all()

    out = []
    for p in paths:
        total = sum(len(m.sections) for m in p.modules)
        completed = 0
        if user:
            section_ids = [s.id for m in p.modules for s in m.sections]
            if section_ids:
                res = await db.execute(
                    select(func.count())
                    .select_from(UserProgress)
                    .where(
                        UserProgress.user_id == user.id,
                        UserProgress.section_id.in_(section_ids),
                        UserProgress.completed == True,  # noqa: E712
                    )
                )
                completed = res.scalar() or 0

        out.append(PathOut(
            id=p.id, title=p.title, slug=p.slug, description=p.description,
            category=p.category, difficulty=p.difficulty, icon=p.icon,
            language_key=p.language_key, order=p.order,
            total_sections=total, completed_sections=completed,
        ))
    return out


@router.get("/{slug}", response_model=PathDetailOut)
async def get_path(
    slug: str,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Path)
        .where(Path.slug == slug)
        .options(selectinload(Path.modules).selectinload(Module.sections))
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")

    # Fetch user progress for all sections in this path
    user_progress_map = {}
    if user:
        section_ids = [s.id for m in path.modules for s in m.sections]
        if section_ids:
            res = await db.execute(
                select(UserProgress).where(
                    UserProgress.user_id == user.id,
                    UserProgress.section_id.in_(section_ids),
                )
            )
            for up in res.scalars().all():
                user_progress_map[up.section_id] = up

    modules_out = []
    total = 0
    completed = 0
    for m in path.modules:
        sections_out = []
        for s in m.sections:
            total += 1
            up = user_progress_map.get(s.id)
            is_completed = up.completed if up else False
            user_score = up.score if up else 0
            if is_completed:
                completed += 1
            sections_out.append(SectionOut(
                id=s.id, title=s.title, content_type=s.content_type,
                body_markdown=s.body_markdown, code_snippet=s.code_snippet,
                choices=s.choices, explanation=None,  # Don't reveal explanation before answering
                test_cases=s.test_cases, points_value=s.points_value, order=s.order,
                completed=is_completed, user_score=user_score,
            ))
        modules_out.append(ModuleOut(
            id=m.id, title=m.title, slug=m.slug,
            description=m.description, order=m.order, sections=sections_out,
        ))

    return PathDetailOut(
        id=path.id, title=path.title, slug=path.slug,
        description=path.description, category=path.category,
        difficulty=path.difficulty, icon=path.icon,
        language_key=path.language_key, order=path.order,
        total_sections=total, completed_sections=completed,
        modules=modules_out,
    )
