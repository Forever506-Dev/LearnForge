"""
Seed realistic user progress data for demo purposes.
Populates the admin user's progress on all paths with random 50-100% completion,
naturally spread timestamps, and believable attempt counts.

Run:  python -m scripts.seed_progress
"""

from __future__ import annotations

import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, text

from app.database import get_engine, get_session_maker, Base
from app.models import User, Path

logger = logging.getLogger("seed_progress")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

random.seed()  # truly random each run


async def main() -> None:
    logger.info("═══ Progress Seeder ═══")

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = get_session_maker()

    async with session_maker() as db:
        # Grab the admin user
        result = await db.execute(select(User).where(User.is_admin == True))
        user = result.scalar_one()
        logger.info("Targeting user: %s (id=%s)", user.username, user.id)

        # All paths ordered naturally
        result = await db.execute(select(Path).order_by(Path.order))
        paths = result.scalars().all()

        now = datetime.now(timezone.utc)
        total_xp = 0

        for path in paths:
            target_pct = random.randint(50, 100) / 100

            # Fetch all sections in module/section order
            rows = (await db.execute(
                text("""
                    SELECT s.id, s.points_value
                    FROM sections s
                    JOIN modules m ON s.module_id = m.id
                    WHERE m.path_id = :pid
                    ORDER BY m.order ASC, s.order ASC
                """),
                {"pid": str(path.id)},
            )).fetchall()

            if not rows:
                continue

            num_complete = max(1, round(len(rows) * target_pct))
            actual_pct = round(num_complete / len(rows) * 100)
            logger.info(
                "  %-30s → %3d%%  (%d/%d sections)",
                path.title, actual_pct, num_complete, len(rows),
            )

            for idx, (section_id, points_value) in enumerate(rows):
                is_completed = idx < num_complete

                if is_completed:
                    # Spread completed sections over the past 3 weeks;
                    # earlier sections were done earlier, with small random jitter.
                    progress_frac = idx / max(num_complete - 1, 1)
                    days_ago = 21 * (1 - progress_frac) + random.uniform(-0.4, 0.4)
                    completed_at = now - timedelta(days=max(0.0, days_ago))
                    # Most sections solved on first or second try
                    attempts = random.choices([1, 2, 3], weights=[65, 28, 7])[0]
                    score = points_value
                    total_xp += points_value
                else:
                    completed_at = None
                    # Not yet done: either untouched or tried and failed
                    attempts = random.choices([0, 1, 2], weights=[55, 35, 10])[0]
                    score = 0

                await db.execute(
                    text("""
                        INSERT INTO user_progress
                            (id, user_id, section_id, completed, score, attempts, completed_at)
                        VALUES
                            (:id, :uid, :sid, :completed, :score, :attempts, :completed_at)
                        ON CONFLICT (user_id, section_id) DO UPDATE SET
                            completed    = EXCLUDED.completed,
                            score        = EXCLUDED.score,
                            attempts     = EXCLUDED.attempts,
                            completed_at = EXCLUDED.completed_at
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "uid": str(user.id),
                        "sid": str(section_id),
                        "completed": is_completed,
                        "score": score,
                        "attempts": attempts,
                        "completed_at": completed_at,
                    },
                )

        # Update user's XP, streak, and last-active to look like recent activity
        streak = random.randint(6, 14)
        longest = streak + random.randint(0, 6)
        last_active = now - timedelta(hours=random.randint(0, 3))

        await db.execute(
            text("""
                UPDATE users
                SET xp_total         = :xp,
                    current_streak   = :streak,
                    longest_streak   = :longest,
                    last_active_date = :last_active
                WHERE id = :uid
            """),
            {
                "xp": total_xp,
                "streak": streak,
                "longest": longest,
                "last_active": last_active,
                "uid": str(user.id),
            },
        )

        await db.commit()

    logger.info("Total XP awarded : %d", total_xp)
    logger.info("Current streak   : %d days", streak)
    logger.info("═══ Progress seeding complete ═══")


if __name__ == "__main__":
    asyncio.run(main())
