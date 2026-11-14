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
    # Transparent skill overlap vs must-haves (0–100). Explainability aid — not a hiring score.
    skill_overlap_pct: int | None = None
    must_have_total: int | None = None
    must_have_covered: int | None = None
    # Existing approach from this seeker to this brief, if any.
    approach_status: str | None = None


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
    # Only filled once the company has accepted (identity reveal after mutual consent).
    seeker_display_name: str | None = None
    bucket: Literal["strong", "good", "explore"] | None = None
    fit_summary: str | None = None


class InviteOut(BaseModel):
    id: int
    brief_id: int
    seeker_id: int
    status: Literal["invited", "accepted", "declined", "withdrawn"]
    message: str
    proposed_slot: str
    created_at: datetime | None = None
    responded_at: datetime | None = None
    brief_title: str | None = None
    company_name: str | None = None
    seeker_alias: str | None = None
    # Only filled once the seeker has accepted the invitation.
    seeker_display_name: str | None = None


class MustHaveCheck(BaseModel):
    skill: str
    status: Literal["evidenced", "related", "not_evidenced"]
    seeker_skill: str | None = None
    evidence_quote: str | None = None


class ReviewFlag(BaseModel):
    """Something a human should check in conversation. Never used to rank or filter."""

    kind: Literal[
        "unconfirmed_skill",
        "short_evidence",
        "shared_quote",
        "similar_phrasing",
        "missing_must_have",
        "consideration",
    ]
    text: str
    skill: str | None = None


class CandidateReview(BaseModel):
    suggestion: Suggestion
    must_haves: list[MustHaveCheck]
    flags: list[ReviewFlag]
    provenance: list[str]
    skills: list[StorySkillOut]
    approved_at: datetime | None = None
    invite: InviteOut | None = None
    approach_status: str | None = None


class BriefStats(BaseModel):
    brief_id: int
    title: str
    status: str
    work_mode: str
    created_at: datetime | None = None
    must_count: int
    learnable_count: int
    nice_count: int
    languages: list[LanguageLevel]
    candidates: dict[str, int]
    requests: dict[str, int]
    invites: dict[str, int]
    queue_est_minutes: int


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


