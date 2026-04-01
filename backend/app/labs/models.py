"""
LearnForge — Lab models: LabTemplate + Lab.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


def _uuid():
    return uuid.uuid4()


# ── Enums ──────────────────────────────────────────────────────

class LabProtocol(str, enum.Enum):
    ssh = "ssh"
    vnc = "vnc"
    rdp = "rdp"
    web = "web"
    novnc = "novnc"   # Full desktop VM exposed through a browser console port


class LabStatus(str, enum.Enum):
    queued = "queued"
    provisioning = "provisioning"
    running = "running"
    stopping = "stopping"
    stopped = "stopped"
    failed = "failed"


class LabDifficulty(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class LabCategory(str, enum.Enum):
    web_hacking = "web_hacking"
    linux = "linux"
    privilege_escalation = "privilege_escalation"
    cve_exploitation = "cve_exploitation"
    network = "network"
    vm = "vm"   # Full VM machines (Parrot OS, Kali, etc.)


# ── Lab Template ───────────────────────────────────────────────

class LabTemplate(Base):
    __tablename__ = "lab_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    docker_image: Mapped[str] = mapped_column(String(500), nullable=False)
    protocol: Mapped[LabProtocol] = mapped_column(Enum(LabProtocol), nullable=False)
    internal_port: Mapped[int] = mapped_column(Integer, nullable=False)
    default_credentials: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    difficulty: Mapped[LabDifficulty] = mapped_column(Enum(LabDifficulty), nullable=False)
    category: Mapped[LabCategory] = mapped_column(Enum(LabCategory), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tutorial_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # relationships
    labs: Mapped[list["Lab"]] = relationship(back_populates="template", cascade="all, delete-orphan")


# ── Lab Instance ───────────────────────────────────────────────

class Lab(Base):
    __tablename__ = "labs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lab_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[LabStatus] = mapped_column(Enum(LabStatus), default=LabStatus.queued, nullable=False)
    container_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    container_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    network_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    web_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ssh_host: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ssh_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ssh_user: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ssh_password: Mapped[str | None] = mapped_column(String(256), nullable=True)
    queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    template: Mapped["LabTemplate"] = relationship(back_populates="labs")
