"""
LearnForge — JWT authentication helpers.
Hardened: argon2id hashing, jti claims, Redis token blacklist.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import redis.asyncio as aioredis
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User

# ── Argon2id password hashing ──────────────────────────────────

_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,   # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

bearer_scheme = HTTPBearer()


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


# ── JWT helpers ────────────────────────────────────────────────

def create_access_token(user_id: uuid.UUID) -> tuple[str, str]:
    """Create an access token. Returns (token, jti)."""
    settings = get_settings()
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
        "type": "access",
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def create_refresh_token(user_id: uuid.UUID) -> tuple[str, str]:
    """Create a refresh token. Returns (token, jti)."""
    settings = get_settings()
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
        "type": "refresh",
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def decode_token(token: str, expected_type: str = "access") -> tuple[Optional[uuid.UUID], Optional[str]]:
    """Decode a token. Returns (user_id, jti) or (None, None)."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != expected_type:
            return None, None
        sub = payload.get("sub")
        jti = payload.get("jti")
        uid = uuid.UUID(sub) if sub else None
        return uid, jti
    except (JWTError, ValueError):
        return None, None


# ── Redis token blacklist ──────────────────────────────────────

async def _get_redis() -> aioredis.Redis:
    settings = get_settings()
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def blacklist_token(jti: str, ttl_seconds: int) -> None:
    """Add a jti to the blacklist with an expiry matching the token's TTL."""
    r = await _get_redis()
    try:
        await r.set(f"bl:{jti}", "1", ex=max(ttl_seconds, 1))
    finally:
        await r.aclose()


async def is_token_blacklisted(jti: str) -> bool:
    r = await _get_redis()
    try:
        return await r.exists(f"bl:{jti}") > 0
    finally:
        await r.aclose()


# ── FastAPI dependencies ───────────────────────────────────────

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id, jti = decode_token(creds.credentials, expected_type="access")
    if user_id is None or jti is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    # Check blacklist
    if await is_token_blacklisted(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if creds is None:
        return None
    user_id, jti = decode_token(creds.credentials, expected_type="access")
    if user_id is None or jti is None:
        return None
    if await is_token_blacklisted(jti):
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
