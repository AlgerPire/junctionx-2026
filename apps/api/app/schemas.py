from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class LanguageLevel(BaseModel):
    lang: str
    level: str


class SkillRef(BaseModel):
    skill_id: int
    label: str


class SeekerSkillView(BaseModel):
    """Matching DTO — must never contain identity or protected attributes."""

    seeker_id: int
    skills: list[SkillRef]
    evidence: dict[int, str]
    languages: list[LanguageLevel]
    needs_relocation: bool


class BriefView(BaseModel):
    """Matching DTO — must never contain identity or protected attributes."""

    brief_id: int
    title: str
    must: list[SkillRef]
    learnable: list[SkillRef]
    nice: list[SkillRef]
    required_languages: list[LanguageLevel]
    relocation_support: bool
    on_site: bool


class Reason(BaseModel):
    type: Literal["direct", "transferable", "learnable_gap", "consideration"]
    brief_skill: str | None = None
    seeker_skill: str | None = None
    evidence_quote: str | None = None
    text: str


class Suggestion(BaseModel):
    brief_id: int
    seeker_id: int
    bucket: Literal["strong", "good", "explore"]
    reasons: list[Reason]
    data_used: list[str]
    company_name: str | None = None
    brief_summary: str | None = None
    seeker_alias: str | None = None
    # Plain-language overview drafted from match reasons (explain only — not a score).
    fit_summary: str | None = None
    gaps_summary: str | None = None
    overview: str | None = None


class PersonaOut(BaseModel):
    id: str
    role: Literal["company", "seeker", "organiser"]
    label: str


class HealthOut(BaseModel):
    ok: bool


class BriefSkillOut(BaseModel):
    skill_id: int
    label: str
    importance: Literal["must", "learnable", "nice"]
    source_quote: str | None = None


class BriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    event_id: int
    title: str
    plain_summary: str
    problem_90_days: str
    status: str
    required_languages: list[LanguageLevel]
    international_ok: bool
    relocation_support: bool
    onboarding_support: str
    permit_info_url: str | None
    work_mode: str
    tables: int
    slot_minutes: int
    created_at: datetime | None = None
    company_name: str | None = None
    skills: list[BriefSkillOut] = Field(default_factory=list)


class StorySkillOut(BaseModel):
    skill_id: int
    label: str
    evidence_quote: str
    seeker_confirmed: bool


class StoryOut(BaseModel):
    id: int
    seeker_id: int
    status: str
    approved_at: datetime | None
    transcript_text: str | None = None
    skills: list[StorySkillOut] = Field(default_factory=list)


class ApproachOut(BaseModel):
    id: int
    seeker_id: int
    brief_id: int
    status: str
    created_at: datetime | None = None
    decided_at: datetime | None = None
    seeker_alias: str | None = None
    brief_title: str | None = None
    queue_est_minutes: int | None = None


class AuditEntryOut(BaseModel):
    id: int
    ts: datetime
    actor_role: str
    actor_id: str
    action: str
    payload: dict[str, Any]


class SuggestionsResponse(BaseModel):
    suggestions: list[Suggestion]
    budget_remaining: int | None = None


class QueueEstimate(BaseModel):
    position: int
    est_minutes: int


class SupplyGapRow(BaseModel):
    skill: str
    cluster: str
    demand: float
    supply: float
    gap: float
    suppressed: bool = False
