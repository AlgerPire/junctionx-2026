from __future__ import annotations

from sqlalchemy.orm import Session

from app.deps import load_published_briefs, to_brief_view, to_seeker_skill_view
from app.models import Brief, Seeker
from app.services.embeddings import skill_index
from app.services.matching import match, rank_suggestions


def get_my_suggestions(db: Session, seeker: Seeker, limit: int = 5) -> list[dict]:
    view = to_seeker_skill_view(db, seeker)
    if view is None:
        return []
    briefs = load_published_briefs(db)
    eid = briefs[0].event_id if briefs else 0
    scored = []
    for brief in briefs:
        sug, coverage = match(view, to_brief_view(brief), skill_index.sim, event_id=eid)
        if sug:
            sug.company_name = brief.company.name
            sug.brief_summary = brief.plain_summary
            scored.append((sug, coverage))
    ranked = rank_suggestions(scored, event_id=eid)[:limit]
    return [s.model_dump() for s in ranked]


def get_brief_summary(db: Session, brief_id: int) -> dict | None:
    briefs = {b.id: b for b in load_published_briefs(db)}
    brief = briefs.get(brief_id)
    if brief is None:
        return None
    return {
        "brief_id": brief.id,
        "title": brief.title,
        "company": brief.company.name,
        "summary": brief.plain_summary,
        "problem_90_days": brief.problem_90_days,
    }


def get_queue_estimate(db: Session, brief: Brief) -> dict:
    from app.routers.approaches import _queue_estimate

    est = _queue_estimate(db, brief)
    return est.model_dump()


def get_my_budget(seeker: Seeker) -> dict:
    return {
        "remaining": seeker.approach_budget_remaining,
        "total": seeker.approach_budget_total,
    }
