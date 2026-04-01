"""
LearnForge — Admin router: CRUD for paths, modules, sections + reseed.
"""

from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import require_admin
from app.database import get_db
from app.models import Module, Path, Section, User
from app.schemas import (
    ModuleCreate,
    ModuleOut,
    ModuleUpdate,
    PathCreate,
    PathDetailOut,
    PathOut,
    PathUpdate,
    SectionCreate,
    SectionOut,
    SectionUpdate,
)

router = APIRouter()


# ── Paths CRUD ─────────────────────────────────────────────────

@router.post("/paths", response_model=PathOut, status_code=201)
async def create_path(
    body: PathCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    path = Path(**body.model_dump())
    db.add(path)
    await db.commit()
    await db.refresh(path)
    return PathOut(
        id=path.id, title=path.title, slug=path.slug,
        description=path.description, category=path.category,
        difficulty=path.difficulty, icon=path.icon,
        language_key=path.language_key, order=path.order,
        total_sections=0, completed_sections=0,
    )


@router.patch("/paths/{path_id}", response_model=PathOut)
async def update_path(
    path_id: uuid.UUID,
    body: PathUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Path).where(Path.id == path_id))
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(path, field, value)
    await db.commit()
    await db.refresh(path)
    return PathOut(
        id=path.id, title=path.title, slug=path.slug,
        description=path.description, category=path.category,
        difficulty=path.difficulty, icon=path.icon,
        language_key=path.language_key, order=path.order,
        total_sections=0, completed_sections=0,
    )


@router.delete("/paths/{path_id}", status_code=204)
async def delete_path(
    path_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Path).where(Path.id == path_id))
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    await db.delete(path)
    await db.commit()


# ── Modules CRUD ───────────────────────────────────────────────

@router.post("/paths/{path_id}/modules", response_model=ModuleOut, status_code=201)
async def create_module(
    path_id: uuid.UUID,
    body: ModuleCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Path).where(Path.id == path_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Path not found")

    module = Module(path_id=path_id, **body.model_dump())
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return ModuleOut(
        id=module.id, title=module.title, slug=module.slug,
        description=module.description, order=module.order, sections=[],
    )


@router.patch("/modules/{module_id}", response_model=ModuleOut)
async def update_module(
    module_id: uuid.UUID,
    body: ModuleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(module, field, value)
    await db.commit()
    await db.refresh(module)
    return ModuleOut(
        id=module.id, title=module.title, slug=module.slug,
        description=module.description, order=module.order, sections=[],
    )


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(
    module_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    await db.delete(module)
    await db.commit()


# ── Sections CRUD ──────────────────────────────────────────────

@router.post("/modules/{module_id}/sections", response_model=SectionOut, status_code=201)
async def create_section(
    module_id: uuid.UUID,
    body: SectionCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Module not found")

    section = Section(module_id=module_id, **body.model_dump())
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return SectionOut(
        id=section.id, title=section.title, content_type=section.content_type,
        body_markdown=section.body_markdown, code_snippet=section.code_snippet,
        choices=section.choices, explanation=section.explanation,
        test_cases=section.test_cases, points_value=section.points_value,
        order=section.order, completed=False, user_score=0,
    )


@router.patch("/sections/{section_id}", response_model=SectionOut)
async def update_section(
    section_id: uuid.UUID,
    body: SectionUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    await db.commit()
    await db.refresh(section)
    return SectionOut(
        id=section.id, title=section.title, content_type=section.content_type,
        body_markdown=section.body_markdown, code_snippet=section.code_snippet,
        choices=section.choices, explanation=section.explanation,
        test_cases=section.test_cases, points_value=section.points_value,
        order=section.order, completed=False, user_score=0,
    )


@router.delete("/sections/{section_id}", status_code=204)
async def delete_section(
    section_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await db.delete(section)
    await db.commit()


# ── Reseed ─────────────────────────────────────────────────────

@router.post("/seed", status_code=200)
async def reseed(admin: User = Depends(require_admin)):
    """Re-run the content seeder from JSON files."""
    import asyncio
    proc = await asyncio.create_subprocess_exec(
        "python", "-m", "scripts.seed_content",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return {"stdout": stdout.decode(), "stderr": stderr.decode(), "code": proc.returncode}
