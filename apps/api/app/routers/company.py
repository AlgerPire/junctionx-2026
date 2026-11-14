from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, to_brief_view
from app.models import Approach, Brief, BriefSkill, Company, Invite, SkillStory, StorySkill
from app.routers.approaches import queue_estimate
from app.routers.invites import invite_out
from app.schemas import BriefStats, CandidateReview, LanguageLevel, StorySkillOut
from app.services.audit import write_audit
from app.services.candidate_pool import (
    all_candidates,
    company_for_persona,
    load_brief,
    suggested_candidates,
)
from app.services.candidate_review import must_have_checklist, provenance_notes, review_flags
from app.services.company_desk import reply_to_company_ask

router = APIRouter(prefix="/api/company", tags=["company"])


class CompanyAskBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def _require_company(db: Session, persona: PersonaContext) -> Company:
    if persona.role != "company":
        raise HTTPException(status_code=403, detail="Company persona required")
    company = company_for_persona(db, persona.id, persona.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


def _counts(statuses: list[str], keys: tuple[str, ...]) -> dict[str, int]:
    found = Counter(statuses)
    return {k: found.get(k, 0) for k in keys}


@router.get("/briefs/stats", response_model=list[BriefStats])
def brief_stats(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[BriefStats]:
    company = _require_company(db, persona)
    briefs = db.scalars(
        select(Brief)
        .where(Brief.company_id == company.id)
        .options(selectinload(Brief.skills).selectinload(BriefSkill.skill))
        .order_by(Brief.created_at.desc())
    ).all()
    out: list[BriefStats] = []
    for brief in briefs:
        importance = Counter(bs.importance for bs in brief.skills)
        buckets = (
            [s.bucket for s in all_candidates(db, brief)] if brief.status == "published" else []
        )
        approaches = db.scalars(select(Approach.status).where(Approach.brief_id == brief.id)).all()
        invites = db.scalars(select(Invite.status).where(Invite.brief_id == brief.id)).all()
        out.append(
            BriefStats(
                brief_id=brief.id,
                title=brief.title,
                status=brief.status,
                work_mode=brief.work_mode,
                created_at=brief.created_at,
                must_count=importance.get("must", 0),
                learnable_count=importance.get("learnable", 0),
                nice_count=importance.get("nice", 0),
                languages=[LanguageLevel(**x) for x in (brief.required_languages or [])],
                candidates=_counts(buckets, ("strong", "good", "explore")),
                requests=_counts(list(approaches), ("requested", "accepted", "declined")),
                invites=_counts(list(invites), ("invited", "accepted", "declined")),
                queue_est_minutes=queue_estimate(db, brief).est_minutes,
            )
        )
    return out


@router.get("/briefs/{brief_id}/candidates", response_model=list[CandidateReview])
def brief_candidates(
    brief_id: int,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[CandidateReview]:
    company = _require_company(db, persona)
    brief = load_brief(db, brief_id)
    if brief is None or brief.company_id != company.id:
        raise HTTPException(status_code=404, detail="Brief not found")
    if brief.status != "published":
        return []

    brief_view = to_brief_view(brief)
    suggestions = suggested_candidates(db, brief)
    seeker_ids = [s.seeker_id for s in suggestions]
    stories = {
        st.seeker_id: st
        for st in db.scalars(
            select(SkillStory)
            .where(SkillStory.seeker_id.in_(seeker_ids), SkillStory.status == "approved")
            .options(selectinload(SkillStory.skills).selectinload(StorySkill.skill))
        ).all()
    }
    invites = {
        i.seeker_id: i
        for i in db.scalars(
            select(Invite)
            .where(Invite.brief_id == brief.id, Invite.seeker_id.in_(seeker_ids))
            .options(
                selectinload(Invite.seeker), selectinload(Invite.brief).selectinload(Brief.company)
            )
        ).all()
    }
    approaches = {
        a.seeker_id: a.status
        for a in db.scalars(
            select(Approach).where(
                Approach.brief_id == brief.id, Approach.seeker_id.in_(seeker_ids)
            )
        ).all()
    }

    out: list[CandidateReview] = []
    for sug in suggestions:
        story = stories.get(sug.seeker_id)
        skills = [
            StorySkillOut(
                skill_id=ss.skill_id,
                label=ss.skill.label,
                evidence_quote=ss.evidence_quote,
                seeker_confirmed=ss.seeker_confirmed,
            )
            for ss in (story.skills if story else [])
        ]
        invite = invites.get(sug.seeker_id)
        out.append(
            CandidateReview(
                suggestion=sug,
                must_haves=must_have_checklist(brief_view, sug.reasons),
                flags=review_flags(skills, sug.reasons),
                provenance=provenance_notes(skills, story.approved_at if story else None),
                skills=skills,
                approved_at=story.approved_at if story else None,
                invite=invite_out(invite) if invite else None,
                approach_status=approaches.get(sug.seeker_id),
            )
        )
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="suggestion_view",
        payload={"brief_id": brief.id, "count": len(out), "view": "candidate_review"},
    )
    db.commit()
    return out


@router.post("/ask")
def company_ask(
    body: CompanyAskBody,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    """Voice/text desk for HR: answer and optionally point at the right page."""
    company = _require_company(db, persona)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty question")

    briefs = list(
        db.scalars(
            select(Brief)
            .where(Brief.company_id == company.id)
            .order_by(Brief.created_at.desc())
        ).all()
    )
    brief_rows = [
        {
            "id": b.id,
            "title": b.title,
            "plain_summary": b.plain_summary,
            "status": b.status,
        }
        for b in briefs
    ]

    candidate_rows: list[dict] = []
    for brief in briefs:
        if brief.status != "published":
            continue
        for sug in suggested_candidates(db, brief)[:8]:
            candidate_rows.append(
                {
                    "brief_id": brief.id,
                    "brief_title": brief.title,
                    "seeker_id": sug.seeker_id,
                    "seeker_alias": sug.seeker_alias,
                    "bucket": sug.bucket,
                }
            )

    inbox_open = len(
        db.scalars(
            select(Approach.id).where(
                Approach.brief_id.in_([b.id for b in briefs] or [-1]),
                Approach.status == "requested",
            )
        ).all()
    )

    reply = reply_to_company_ask(
        text,
        briefs=brief_rows,
        candidates=candidate_rows,
        inbox_open=inbox_open,
    )
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="company_desk_ask",
        payload={
            "action": reply.action,
            "brief_id": reply.brief_id,
            "seeker_id": reply.seeker_id,
            "has_href": bool(reply.href),
        },
    )
    db.commit()
    return {
        "answer": reply.answer,
        "action": reply.action,
        "href": reply.href,
        "label": reply.label,
        "brief_id": reply.brief_id,
        "seeker_id": reply.seeker_id,
    }
