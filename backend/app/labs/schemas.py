"""
LearnForge — Lab Pydantic schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.labs.models import LabCategory, LabDifficulty, LabProtocol, LabStatus


# ── Lab Template ───────────────────────────────────────────────

class LabTemplateOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    docker_image: str
    protocol: LabProtocol
    internal_port: int
    default_credentials: Optional[Dict[str, Any]] = None
    difficulty: LabDifficulty
    category: LabCategory
    description: str
    tutorial_markdown: str
    icon: Optional[str] = None
    xp_reward: int
    is_active: bool

    class Config:
        from_attributes = True


class LabTemplateListOut(BaseModel):
    """Lighter version for catalog listing (no tutorial markdown)."""
    id: uuid.UUID
    name: str
    slug: str
    protocol: LabProtocol
    difficulty: LabDifficulty
    category: LabCategory
    description: str
    icon: Optional[str] = None
    xp_reward: int

    class Config:
        from_attributes = True


# ── Lab Instance ───────────────────────────────────────────────

class LabStartRequest(BaseModel):
    template_id: uuid.UUID


class LabOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    template_id: uuid.UUID
    status: LabStatus
    web_url: Optional[str] = None
    queue_position: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    template: Optional[LabTemplateListOut] = None

    class Config:
        from_attributes = True


class LabStatusOut(BaseModel):
    id: uuid.UUID
    status: LabStatus
    web_url: Optional[str] = None
    ssh_host: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_user: Optional[str] = None
    ssh_password: Optional[str] = None
    queue_position: Optional[int] = None
    expires_at: Optional[datetime] = None
    progress_pct: Optional[int] = None
    progress_stage: Optional[str] = None
