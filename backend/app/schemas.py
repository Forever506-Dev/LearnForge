"""
LearnForge — Pydantic request / response schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import CategoryEnum, DifficultyEnum, SectionTypeEnum


# ── Auth ───────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=32, pattern=r'^[a-zA-Z0-9_-]+$')
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User / Profile ─────────────────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    xp_total: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=64)
    avatar_url: Optional[str] = None


# ── Paths ──────────────────────────────────────────────────────

class SectionOut(BaseModel):
    id: uuid.UUID
    title: str
    content_type: SectionTypeEnum
    body_markdown: Optional[str] = None
    code_snippet: Optional[str] = None
    choices: Optional[dict] = None
    explanation: Optional[str] = None
    test_cases: Optional[list] = None
    points_value: int
    order: int
    completed: bool = False
    user_score: int = 0

    class Config:
        from_attributes = True


class ModuleOut(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str
    order: int
    sections: List[SectionOut] = []

    class Config:
        from_attributes = True


class PathOut(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str
    category: CategoryEnum
    difficulty: DifficultyEnum
    icon: Optional[str] = None
    language_key: Optional[str] = None
    order: int
    total_sections: int = 0
    completed_sections: int = 0

    class Config:
        from_attributes = True


class PathDetailOut(PathOut):
    modules: List[ModuleOut] = []


# ── Quiz / Learn ───────────────────────────────────────────────

class SubmitAnswerRequest(BaseModel):
    section_id: uuid.UUID
    answer: str = Field(max_length=10)


class SubmitAnswerResponse(BaseModel):
    correct: bool
    correct_answer: str
    explanation: Optional[str] = None
    xp_earned: int = 0
    new_xp_total: int = 0
    streak: int = 0
    achievements_unlocked: List[str] = []


# ── Code Execution ─────────────────────────────────────────────

class CodeExecuteRequest(BaseModel):
    language: str
    version: str = "*"
    code: str
    stdin: str = ""
    section_id: Optional[uuid.UUID] = None


class TestCaseResult(BaseModel):
    input: str
    expected: str
    actual: str
    passed: bool


class CodeExecuteResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    timed_out: bool = False
    # For coding challenges with test cases
    passed: Optional[int] = None
    total: Optional[int] = None
    test_results: List[TestCaseResult] = []
    xp_earned: int = 0
    achievements_unlocked: List[str] = []


# ── Leaderboard ────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    display_name: str
    avatar_url: Optional[str] = None
    xp_total: int
    current_streak: int
    achievement_count: int = 0


# ── Achievements ───────────────────────────────────────────────

class AchievementOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    icon: str
    unlocked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Admin ──────────────────────────────────────────────────────

class PathCreate(BaseModel):
    title: str
    slug: str
    description: str
    category: CategoryEnum
    difficulty: DifficultyEnum
    icon: Optional[str] = None
    language_key: Optional[str] = None
    order: int = 0


class PathUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[CategoryEnum] = None
    difficulty: Optional[DifficultyEnum] = None
    icon: Optional[str] = None
    language_key: Optional[str] = None
    order: Optional[int] = None


class ModuleCreate(BaseModel):
    title: str
    slug: str
    description: str = ""
    order: int = 0


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None


class SectionCreate(BaseModel):
    title: str
    content_type: SectionTypeEnum
    body_markdown: Optional[str] = None
    code_snippet: Optional[str] = None
    choices: Optional[dict] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    test_cases: Optional[list] = None
    points_value: int = 10
    order: int = 0


class SectionUpdate(BaseModel):
    title: Optional[str] = None
    content_type: Optional[SectionTypeEnum] = None
    body_markdown: Optional[str] = None
    code_snippet: Optional[str] = None
    choices: Optional[dict] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    test_cases: Optional[list] = None
    points_value: Optional[int] = None
    order: Optional[int] = None
