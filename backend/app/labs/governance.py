"""
LearnForge — Lab governance: concurrency cap + Redis queue.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Optional

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger("lab_governance")

ACTIVE_COUNT_KEY = "labs:active_count"
QUEUE_KEY = "labs:queue"


async def _get_redis() -> aioredis.Redis:
    settings = get_settings()
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_active_count() -> int:
    """Get the current number of running labs."""
    r = await _get_redis()
    try:
        val = await r.get(ACTIVE_COUNT_KEY)
        return int(val) if val else 0
    finally:
        await r.aclose()


async def can_start_lab() -> bool:
    """Check if we have capacity to start a new lab."""
    settings = get_settings()
    count = await get_active_count()
    return count < settings.MAX_CONCURRENT_LABS


async def increment_active() -> int:
    """Atomically increment the active lab counter. Returns new value."""
    r = await _get_redis()
    try:
        return await r.incr(ACTIVE_COUNT_KEY)
    finally:
        await r.aclose()


async def decrement_active() -> int:
    """Atomically decrement the active lab counter. Returns new value."""
    r = await _get_redis()
    try:
        val = await r.decr(ACTIVE_COUNT_KEY)
        # Never go below 0
        if val < 0:
            await r.set(ACTIVE_COUNT_KEY, 0)
            return 0
        return val
    finally:
        await r.aclose()


async def enqueue_lab(lab_id: uuid.UUID, user_id: uuid.UUID, template_id: uuid.UUID) -> int:
    """
    Add a lab to the queue. Returns the queue position (1-indexed).
    """
    r = await _get_redis()
    try:
        item = json.dumps({
            "lab_id": str(lab_id),
            "user_id": str(user_id),
            "template_id": str(template_id),
        })
        await r.rpush(QUEUE_KEY, item)
        queue_len = await r.llen(QUEUE_KEY)
        return queue_len
    finally:
        await r.aclose()


async def dequeue_lab() -> Optional[dict]:
    """Pop the next lab from the queue. Returns dict or None if empty."""
    r = await _get_redis()
    try:
        item = await r.lpop(QUEUE_KEY)
        if item:
            return json.loads(item)
        return None
    finally:
        await r.aclose()


async def get_queue_position(lab_id: uuid.UUID) -> Optional[int]:
    """Get the 1-indexed position of a lab in the queue. Returns None if not found."""
    r = await _get_redis()
    try:
        items = await r.lrange(QUEUE_KEY, 0, -1)
        for i, raw in enumerate(items):
            data = json.loads(raw)
            if data.get("lab_id") == str(lab_id):
                return i + 1
        return None
    finally:
        await r.aclose()


async def remove_from_queue(lab_id: uuid.UUID) -> bool:
    """Remove a lab from the queue (e.g., if user cancels). Returns True if removed."""
    r = await _get_redis()
    try:
        items = await r.lrange(QUEUE_KEY, 0, -1)
        for raw in items:
            data = json.loads(raw)
            if data.get("lab_id") == str(lab_id):
                await r.lrem(QUEUE_KEY, 1, raw)
                return True
        return False
    finally:
        await r.aclose()


# ── Provisioning progress tracking ────────────────────────────

PROGRESS_KEY_PREFIX = "labs:progress:"


async def get_lab_progress(lab_id: uuid.UUID) -> dict | None:
    """Get provisioning progress from Redis."""
    r = await _get_redis()
    try:
        val = await r.get(f"{PROGRESS_KEY_PREFIX}{lab_id}")
        return json.loads(val) if val else None
    finally:
        await r.aclose()


async def clear_lab_progress(lab_id: uuid.UUID) -> None:
    """Remove provisioning progress from Redis."""
    r = await _get_redis()
    try:
        await r.delete(f"{PROGRESS_KEY_PREFIX}{lab_id}")
    finally:
        await r.aclose()
