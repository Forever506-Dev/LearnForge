"""
LearnForge — Seed content from JSON files + default achievements.

Run:  python -m scripts.seed_content
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path as FilePath

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.config import get_settings
from app.database import Base, get_engine, get_session_maker
from app.gamification import DEFAULT_ACHIEVEMENTS
from app.models import (
    Achievement,
    CategoryEnum,
    DifficultyEnum,
    Module,
    Path,
    Section,
    SectionTypeEnum,
    User,
)

logger = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

CONTENT_DIR = FilePath(__file__).resolve().parent.parent / "content"


async def seed_achievements(db: AsyncSession) -> None:
    """Insert default achievements if they don't already exist."""
    for ach_data in DEFAULT_ACHIEVEMENTS:
        result = await db.execute(
            select(Achievement).where(Achievement.name == ach_data["name"])
        )
        if result.scalar_one_or_none() is None:
            db.add(Achievement(**ach_data))
            logger.info("  + Achievement: %s", ach_data["name"])
    await db.flush()


async def seed_path(db: AsyncSession, data: dict, order: int) -> None:
    """Upsert a single learning path from a JSON dict."""
    slug = data["slug"]

    # Check if path exists
    result = await db.execute(select(Path).where(Path.slug == slug))
    existing = result.scalar_one_or_none()

    if existing is not None:
        logger.info("  ⏭  Path '%s' already exists — skipping", slug)
        return

    path = Path(
        title=data["title"],
        slug=slug,
        description=data["description"],
        category=CategoryEnum(data["category"]),
        difficulty=DifficultyEnum(data["difficulty"]),
        icon=data.get("icon"),
        language_key=data.get("language_key"),
        order=order,
    )
    db.add(path)
    await db.flush()  # generate path.id

    for m_idx, m_data in enumerate(data.get("modules", [])):
        module = Module(
            path_id=path.id,
            title=m_data["title"],
            slug=m_data["slug"],
            description=m_data.get("description", ""),
            order=m_idx,
        )
        db.add(module)
        await db.flush()  # generate module.id

        for s_idx, s_data in enumerate(m_data.get("sections", [])):
            section = Section(
                module_id=module.id,
                title=s_data["title"],
                content_type=SectionTypeEnum(s_data["content_type"]),
                body_markdown=s_data.get("body_markdown"),
                code_snippet=s_data.get("code_snippet"),
                choices=s_data.get("choices"),
                answer=s_data.get("answer"),
                explanation=s_data.get("explanation"),
                test_cases=s_data.get("test_cases"),
                points_value=s_data.get("points_value", 10),
                order=s_idx,
            )
            db.add(section)

        logger.info("    + Module '%s' (%d sections)", m_data["title"], len(m_data.get("sections", [])))

    await db.flush()
    logger.info("  ✔ Path '%s' seeded", slug)


async def main() -> None:
    logger.info("═══ LearnForge Seeder ═══")

    engine = get_engine()

    # Ensure tables exist (safety net before Alembic is set up)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Tables ensured.")

    session_maker = get_session_maker()

    async with session_maker() as db:
        # 0. Seed default admin user
        logger.info("Seeding default user …")
        settings = get_settings()
        result = await db.execute(select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL))
        if result.scalar_one_or_none() is None:
            admin = User(
                email=settings.DEFAULT_ADMIN_EMAIL,
                username=settings.DEFAULT_ADMIN_USERNAME,
                hashed_password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                display_name=settings.DEFAULT_ADMIN_DISPLAY_NAME,
                is_admin=True,
            )
            db.add(admin)
            await db.flush()
            logger.info("  + Default user: %s", settings.DEFAULT_ADMIN_EMAIL)
        else:
            logger.info("  ⏭  Default user already exists — skipping")

        # 1. Seed achievements
        logger.info("Seeding achievements …")
        await seed_achievements(db)

        # 2. Discover and seed JSON content files
        json_files = sorted(CONTENT_DIR.glob("*.json"))
        if not json_files:
            logger.warning("No JSON files found in %s", CONTENT_DIR)
        else:
            logger.info("Found %d content files", len(json_files))

        for idx, json_path in enumerate(json_files):
            logger.info("Processing %s …", json_path.name)
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            await seed_path(db, data, order=idx)

        await db.commit()

    logger.info("═══ Seeding complete ═══")


if __name__ == "__main__":
    asyncio.run(main())
