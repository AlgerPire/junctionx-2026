from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.deps import to_brief_view, to_seeker_skill_view
from app.models import Brief, BriefSkill, Company, Seeker
from app.schemas import Suggestion
from app.services.embeddings import skill_index
from app.services.match_explain import attach_overview
from app.services.matching import match, rank_suggestions

MAX_CANDIDATES = 8


def load_brief(db: Session, brief_id: int) -> Brief | None:
    return db.scalar(
        select(Brief)
        .where(Brief.id == brief_id)
        .options(
            selectinload(Brief.skills).selectinload(BriefSkill.skill),
            selectinload(Brief.company),
        )
    )


def company_for_persona(db: Session, persona_id: str, company_id: int | None) -> Company | None:
    if company_id is not None:
        return db.get(Company, company_id)
    return db.scalar(select(Company).where(Company.demo_key == persona_id))


def all_candidates(db: Session, brief: Brief) -> list[Suggestion]:
    """Every seeker in the explore+ range, ranked. Matching sees only the DTOs."""
    brief_view = to_brief_view(brief)
    scored: list[tuple[Suggestion, float]] = []
    for seeker in db.scalars(select(Seeker)).all():
        view = to_seeker_skill_view(db, seeker)
        if view is None:
            continue
        sug, coverage = match(view, brief_view, skill_index.sim, event_id=brief.event_id)
        if sug is None:
            continue
        sug.seeker_alias = seeker.alias
        attach_overview(sug, coverage, perspective="company")
        scored.append((sug, coverage))
    return rank_suggestions(scored, event_id=brief.event_id)


def suggested_candidates(db: Session, brief: Brief) -> list[Suggestion]:
    return all_candidates(db, brief)[:MAX_CANDIDATES]
