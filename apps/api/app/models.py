from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    mode: Mapped[str] = mapped_column(String(32), nullable=False)  # online|in_person|hybrid
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="upcoming")

    briefs: Mapped[list[Brief]] = relationship(back_populates="event")


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sector: Mapped[str] = mapped_column(String(100), nullable=False)
    size_band: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    demo_key: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)

    briefs: Mapped[list[Brief]] = relationship(back_populates="company")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    esco_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cluster: Mapped[str] = mapped_column(String(64), nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    # Preferred labels by language code: {"en": "...", "fi": "...", "sv": "..."}
    labels: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    synonyms: Mapped[list["SkillSynonym"]] = relationship(back_populates="skill", cascade="all, delete-orphan")


class SkillSynonym(Base):
    __tablename__ = "skill_synonyms"
    __table_args__ = (UniqueConstraint("lang", "synonym", name="uq_skill_synonym_lang"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), nullable=False)
    lang: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    synonym: Mapped[str] = mapped_column(String(200), nullable=False)

    skill: Mapped[Skill] = relationship(back_populates="synonyms")


class PendingSkill(Base):
    """Free-text skill with no ESCO match — flagged for advisor review."""

    __tablename__ = "pending_skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    raw_label: Mapped[str] = mapped_column(String(200), nullable=False)
    lang: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="free_text")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mapped_skill_id: Mapped[int | None] = mapped_column(ForeignKey("skills.id"), nullable=True)


class Brief(Base):
    __tablename__ = "briefs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    plain_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    problem_90_days: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    required_languages: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    international_ok: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    relocation_support: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    onboarding_support: Mapped[str] = mapped_column(Text, nullable=False, default="")
    permit_info_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    work_mode: Mapped[str] = mapped_column(String(32), nullable=False, default="hybrid")
    tables: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    slot_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped[Company] = relationship(back_populates="briefs")
    event: Mapped[Event] = relationship(back_populates="briefs")
    skills: Mapped[list[BriefSkill]] = relationship(back_populates="brief", cascade="all, delete-orphan")


class BriefSkill(Base):
    __tablename__ = "brief_skills"
    __table_args__ = (UniqueConstraint("brief_id", "skill_id", name="uq_brief_skill"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brief_id: Mapped[int] = mapped_column(ForeignKey("briefs.id"), nullable=False)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), nullable=False)
    importance: Mapped[str] = mapped_column(String(16), nullable=False)  # must|learnable|nice
    source_quote: Mapped[str | None] = mapped_column(Text, nullable=True)

    brief: Mapped[Brief] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship()


class Seeker(Base):
    __tablename__ = "seekers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alias: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    languages: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    needs_relocation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    availability: Mapped[str] = mapped_column(String(64), nullable=False, default="event_day")
    approach_budget_total: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    approach_budget_remaining: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    demo_key: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    # Synthetic metadata used only for Bias Mirror counterfactuals / seed stories — never in matching DTOs
    career_path_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    synthetic_nationality: Mapped[str | None] = mapped_column(String(64), nullable=True)
    synthetic_university: Mapped[str | None] = mapped_column(String(120), nullable=True)

    stories: Mapped[list[SkillStory]] = relationship(back_populates="seeker", cascade="all, delete-orphan")


class SkillStory(Base):
    __tablename__ = "skill_stories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seeker_id: Mapped[int] = mapped_column(ForeignKey("seekers.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    transcript_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    keep_transcript: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    seeker: Mapped[Seeker] = relationship(back_populates="stories")
    skills: Mapped[list[StorySkill]] = relationship(back_populates="story", cascade="all, delete-orphan")


class StorySkill(Base):
    __tablename__ = "story_skills"
    __table_args__ = (UniqueConstraint("story_id", "skill_id", name="uq_story_skill"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("skill_stories.id"), nullable=False)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), nullable=False)
    evidence_quote: Mapped[str] = mapped_column(Text, nullable=False)
    seeker_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    story: Mapped[SkillStory] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship()


class Approach(Base):
    __tablename__ = "approaches"
    __table_args__ = (UniqueConstraint("seeker_id", "brief_id", name="uq_seeker_brief_approach"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seeker_id: Mapped[int] = mapped_column(ForeignKey("seekers.id"), nullable=False)
    brief_id: Mapped[int] = mapped_column(ForeignKey("briefs.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="requested")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    seeker: Mapped[Seeker] = relationship()
    brief: Mapped[Brief] = relationship()


class Followup(Base):
    __tablename__ = "followups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    approach_id: Mapped[int] = mapped_column(ForeignKey("approaches.id"), nullable=False)
    voice_note_text: Mapped[str] = mapped_column(Text, nullable=False)
    structured: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # brief|story|followup
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False)
    messages: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    draft: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class FairnessRun(Base):
    __tablename__ = "fairness_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    config: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    results: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class User(Base):
    """Real account (magic-link). Demo personas stay separate via auth_allow_demo."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # seeker|company|advisor|organiser|admin|dpo
    locale: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    seeker_id: Mapped[int | None] = mapped_column(ForeignKey("seekers.id"), nullable=True)
    company_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    company: Mapped[Company | None] = relationship()
    seeker: Mapped[Seeker | None] = relationship()
    consents: Mapped[list["ConsentRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["AuthSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class MagicLink(Base):
    __tablename__ = "magic_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="sessions")


class ConsentRecord(Base):
    __tablename__ = "consent_records"
    __table_args__ = (UniqueConstraint("user_id", "purpose", "version", name="uq_consent_user_purpose_ver"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    purpose: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="consents")


# Silence unused Float import if embeddings move to a dedicated type later
_ = Float
