from __future__ import annotations

from dataclasses import dataclass

from fastapi import Cookie, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.db import SessionLocal
from app.models import AuthSession, Brief, BriefSkill, Seeker, SkillStory, StorySkill, User
from app.schemas import BriefView, LanguageLevel, SeekerSkillView, SkillRef
from app.services.auth_tokens import hash_token, utcnow


@dataclass
class PersonaContext:
    id: str
    role: str
    company_id: int | None = None
    seeker_id: int | None = None
    user_id: int | None = None
    email: str | None = None
    auth_mode: str = "demo"  # demo | session


PERSONAS: dict[str, PersonaContext] = {
    "company_demo": PersonaContext(id="company_demo", role="company"),
    "seeker_demo_a": PersonaContext(id="seeker_demo_a", role="seeker"),
    "seeker_demo_b": PersonaContext(id="seeker_demo_b", role="seeker"),
    "organiser_demo": PersonaContext(id="organiser_demo", role="organiser"),
    "advisor_demo": PersonaContext(id="advisor_demo", role="advisor"),
    "admin_demo": PersonaContext(id="admin_demo", role="admin"),
    "dpo_demo": PersonaContext(id="dpo_demo", role="dpo"),
}

SESSION_COOKIE = "signal_session"


def _persona_from_header(x_persona_id: str) -> PersonaContext:
    if x_persona_id in PERSONAS:
        return PERSONAS[x_persona_id]
    if x_persona_id.startswith("seeker:"):
        return PersonaContext(id=x_persona_id, role="seeker", seeker_id=int(x_persona_id.split(":")[1]))
    if x_persona_id.startswith("company:"):
        return PersonaContext(id=x_persona_id, role="company", company_id=int(x_persona_id.split(":")[1]))
    raise HTTPException(status_code=401, detail=f"Unknown persona: {x_persona_id}")


def _persona_from_user(user: User) -> PersonaContext:
    return PersonaContext(
        id=f"user:{user.id}",
        role=user.role,
        company_id=user.company_id,
        seeker_id=user.seeker_id,
        user_id=user.id,
        email=user.email,
        auth_mode="session",
    )


def _session_user(db: Session, raw_token: str | None) -> User | None:
    if not raw_token:
        return None
    token_hash = hash_token(raw_token)
    row = db.scalar(
        select(AuthSession)
        .where(
            AuthSession.token_hash == token_hash,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > utcnow(),
        )
        .options(selectinload(AuthSession.user))
    )
    if row is None or row.user is None or row.user.status != "active":
        return None
    return row.user


def resolve_persona(
    request: Request,
    x_persona_id: str | None = Header(default=None, alias="X-Persona-Id"),
    signal_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    authorization: str | None = Header(default=None),
) -> PersonaContext:
    """Prefer real session; fall back to demo persona when AUTH_ALLOW_DEMO=1."""
    settings = get_settings()
    bearer: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization.split(" ", 1)[1].strip()

    raw = bearer or signal_session
    db: Session = SessionLocal()
    try:
        user = _session_user(db, raw)
        if user is not None:
            return _persona_from_user(user)
    finally:
        db.close()

    if settings.auth_allow_demo and x_persona_id:
        return _persona_from_header(x_persona_id)

    raise HTTPException(
        status_code=401,
        detail="Sign in required (magic link) or provide X-Persona-Id in demo mode",
    )


def optional_persona(
    request: Request,
    x_persona_id: str | None = Header(default=None, alias="X-Persona-Id"),
    signal_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    authorization: str | None = Header(default=None),
) -> PersonaContext | None:
    try:
        return resolve_persona(
            request,
            x_persona_id=x_persona_id,
            signal_session=signal_session,
            authorization=authorization,
        )
    except HTTPException:
        return None


def check_roles(persona: PersonaContext, *roles: str) -> None:
    if persona.role not in roles:
        raise HTTPException(status_code=403, detail=f"Role {persona.role} not allowed")


def seeker_from_persona(db: Session, persona: PersonaContext) -> Seeker:
    if persona.seeker_id is not None:
        seeker = db.get(Seeker, persona.seeker_id)
    else:
        seeker = db.scalar(select(Seeker).where(Seeker.demo_key == persona.id))
    if seeker is None:
        raise HTTPException(status_code=404, detail="Seeker persona not found")
    return seeker


def to_seeker_skill_view(db: Session, seeker: Seeker) -> SeekerSkillView | None:
    story = db.scalar(
        select(SkillStory)
        .where(SkillStory.seeker_id == seeker.id, SkillStory.status == "approved")
        .options(selectinload(SkillStory.skills).selectinload(StorySkill.skill))
    )
    if story is None:
        return None
    skills = [SkillRef(skill_id=ss.skill_id, label=ss.skill.label) for ss in story.skills]
    evidence = {ss.skill_id: ss.evidence_quote for ss in story.skills}
    languages = [LanguageLevel(**lang) for lang in (seeker.languages or [])]
    return SeekerSkillView(
        seeker_id=seeker.id,
        skills=skills,
        evidence=evidence,
        languages=languages,
        needs_relocation=seeker.needs_relocation,
    )


def to_brief_view(brief: Brief) -> BriefView:
    must: list[SkillRef] = []
    learnable: list[SkillRef] = []
    nice: list[SkillRef] = []
    for bs in brief.skills:
        ref = SkillRef(skill_id=bs.skill_id, label=bs.skill.label)
        if bs.importance == "must":
            must.append(ref)
        elif bs.importance == "learnable":
            learnable.append(ref)
        else:
            nice.append(ref)
    return BriefView(
        brief_id=brief.id,
        title=brief.title,
        must=must,
        learnable=learnable,
        nice=nice,
        required_languages=[LanguageLevel(**lang) for lang in (brief.required_languages or [])],
        relocation_support=brief.relocation_support,
        on_site=brief.work_mode == "on_site",
    )


def load_published_briefs(db: Session) -> list[Brief]:
    return list(
        db.scalars(
            select(Brief)
            .where(Brief.status == "published")
            .options(
                selectinload(Brief.skills).selectinload(BriefSkill.skill),
                selectinload(Brief.company),
            )
        ).all()
    )
