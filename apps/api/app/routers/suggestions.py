from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import (
    PersonaContext,
    load_published_briefs,
    resolve_persona,
    seeker_from_persona,
    to_brief_view,
    to_seeker_skill_view,
)
from app.models import Approach
from app.schemas import BriefOut, BriefSkillOut, LanguageLevel, Suggestion, SuggestionsResponse
from app.services.audit import write_audit
from app.services.candidate_pool import load_brief, suggested_candidates
from app.services.embeddings import skill_index
from app.services.match_explain import attach_overview
from app.services.matching import match, rank_suggestions

router = APIRouter(prefix="/api", tags=["suggestions"])


@router.get("/suggestions/seeker", response_model=SuggestionsResponse)
def suggestions_for_seeker(
    event_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> SuggestionsResponse:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    view = to_seeker_skill_view(db, seeker)
    if view is None:
        return SuggestionsResponse(suggestions=[], budget_remaining=seeker.approach_budget_remaining)

    briefs = load_published_briefs(db)
    if event_id is not None:
        briefs = [b for b in briefs if b.event_id == event_id]
    eid = event_id or (briefs[0].event_id if briefs else 0)

    existing = {
        a.brief_id: a.status
        for a in db.scalars(
            select(Approach).where(Approach.seeker_id == seeker.id)
        ).all()
    }

    scored: list[tuple[Suggestion, float]] = []
    for brief in briefs:
        sug, coverage = match(view, to_brief_view(brief), skill_index.sim, event_id=eid)
        if sug is None:
            continue
        sug.company_name = brief.company.name
        sug.brief_summary = brief.plain_summary
        sug.approach_status = existing.get(brief.id)
        attach_overview(sug, coverage, perspective="seeker")
        scored.append((sug, coverage))

    ranked = rank_suggestions(scored, event_id=eid)[:8]
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="suggestion_view",
        payload={"seeker_id": seeker.id, "count": len(ranked)},
    )
    db.commit()
    return SuggestionsResponse(
        suggestions=ranked,
        budget_remaining=seeker.approach_budget_remaining,
    )


@router.get("/suggestions/brief/{brief_id}", response_model=list[Suggestion])
def suggestions_for_brief(
    brief_id: int,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[Suggestion]:
    brief = load_brief(db, brief_id)
    if brief is None or brief.status != "published":
        raise HTTPException(status_code=404, detail="Brief not found")

    ranked = suggested_candidates(db, brief)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="suggestion_view",
        payload={"brief_id": brief_id, "count": len(ranked)},
    )
    db.commit()
    return ranked


@router.get("/browse/briefs", response_model=list[BriefOut])
def browse_briefs(
    q: str | None = None,
    cluster: str | None = None,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[BriefOut]:
    _ = persona
    briefs = load_published_briefs(db)
    out: list[BriefOut] = []
    for brief in briefs:
        if q and q.lower() not in brief.title.lower() and q.lower() not in brief.plain_summary.lower():
            continue
        if cluster:
            if not any(bs.skill.cluster == cluster for bs in brief.skills):
                continue
        out.append(
            BriefOut(
                id=brief.id,
                company_id=brief.company_id,
                event_id=brief.event_id,
                title=brief.title,
                plain_summary=brief.plain_summary,
                problem_90_days=brief.problem_90_days,
                status=brief.status,
                required_languages=[LanguageLevel(**x) for x in (brief.required_languages or [])],
                international_ok=brief.international_ok,
                relocation_support=brief.relocation_support,
                onboarding_support=brief.onboarding_support,
                permit_info_url=brief.permit_info_url,
                work_mode=brief.work_mode,
                tables=brief.tables,
                slot_minutes=brief.slot_minutes,
                created_at=brief.created_at,
                company_name=brief.company.name,
                skills=[
                    BriefSkillOut(
                        skill_id=bs.skill_id,
                        label=bs.skill.label,
                        importance=bs.importance,  # type: ignore[arg-type]
                        source_quote=bs.source_quote,
                    )
                    for bs in brief.skills
                ],
            )
        )
    return out


@router.get("/skills", response_model=list[dict])
def search_skills(q: str = "", db: Session = Depends(get_db)) -> list[dict]:
    from app.models import Skill

    stmt = select(Skill).order_by(Skill.label).limit(50)
    if q:
        stmt = select(Skill).where(Skill.label.ilike(f"%{q}%")).order_by(Skill.label).limit(50)
    return [{"skill_id": s.id, "label": s.label} for s in db.scalars(stmt).all()]
