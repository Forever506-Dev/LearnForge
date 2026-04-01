"""
LearnForge — Auth router: register, login, refresh, logout.
Hardened with rate limiting, password strength validation, token blacklist.
"""

import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    blacklist_token,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("auth")

PASSWORD_RE = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Password strength check
    if not PASSWORD_RE.match(body.password):
        raise HTTPException(
            status_code=422,
            detail="Password must be ≥8 chars with uppercase, lowercase, and a digit",
        )

    # Check duplicate email
    exists = await db.execute(select(User).where(User.email == body.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check duplicate username
    exists = await db.execute(select(User).where(User.username == body.username))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("New user registered: username=%s", body.username)

    access_token, _ = create_access_token(user.id)
    refresh_token, _ = create_refresh_token(user.id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        logger.warning("Failed login attempt for email=%s", body.email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info("User logged in: user_id=%s", user.id)
    access_token, _ = create_access_token(user.id)
    refresh_token, _ = create_refresh_token(user.id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id, jti = decode_token(body.refresh_token, expected_type="refresh")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Blacklist the old refresh token
    settings = get_settings()
    if jti:
        await blacklist_token(jti, settings.JWT_REFRESH_EXPIRE_DAYS * 86400)

    logger.debug("Token refreshed for user_id=%s", user_id)
    access_token, _ = create_access_token(user.id)
    refresh_token, _ = create_refresh_token(user.id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=200)
async def logout(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Blacklist the current access token so it cannot be reused."""
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    _, jti = decode_token(token, expected_type="access")
    if jti:
        settings = get_settings()
        await blacklist_token(jti, settings.JWT_ACCESS_EXPIRE_MINUTES * 60)
    logger.info("User logged out: user_id=%s", user.id)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
