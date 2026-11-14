from __future__ import annotations

import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, seeker_from_persona, to_seeker_skill_view
from app.models import Approach, Brief, Company, Seeker, SkillStory, StorySkill
from app.schemas import ApproachOut, QueueEstimate, StoryOut, StorySkillOut
from app.services.audit import write_audit

router = APIRouter(prefix="/api", tags=["approaches"])


class ApproachCreate(BaseModel):
    brief_id: int


class ApproachDecide(BaseModel):
    decision: str  # accepted | declined


def _queue_estimate(db: Session, brief: Brief) -> QueueEstimate:
    waiting = db.scalars(
        select(Approach).where(
            Approach.brief_id == brief.id,
            Approach.status == "accepted",
        )
    ).all()
    # accepted but not done count as waiting for demo
    position = len(waiting)
    tables = max(brief.tables, 1)
    est = math.ceil(position / tables) * brief.slot_minutes if position else 0
    return QueueEstimate(position=position, est_minutes=est)


@router.post("/approaches", response_model=ApproachOut)
def create_approach(
    body: ApproachCreate,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> ApproachOut:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    if to_seeker_skill_view(db, seeker) is None:
        raise HTTPException(status_code=400, detail="Approve a skill story before approaching")

    brief = db.get(Brief, body.brief_id)
    if brief is None or brief.status != "published":
        raise HTTPException(status_code=404, detail="Brief not found")

    existing = db.scalar(
        select(Approach).where(
            Approach.seeker_id == seeker.id,
            Approach.brief_id == brief.id,
        )
    )
    if existing and existing.status in {"requested", "accepted"}:
        return ApproachOut(
            id=existing.id,
            seeker_id=existing.seeker_id,
            brief_id=existing.brief_id,
            status=existing.status,
            created_at=existing.created_at,
            brief_title=brief.title,
        )

    result = db.execute(
        update(Seeker)
        .where(Seeker.id == seeker.id, Seeker.approach_budget_remaining > 0)
        .values(approach_budget_remaining=Seeker.approach_budget_remaining - 1)
        .returning(Seeker.approach_budget_remaining)
    )
    remaining = result.scalar_one_or_none()
    if remaining is None:
        raise HTTPException(
            status_code=409,
            detail="Approach budget exhausted. Choose carefully next event.",
        )

    if existing and existing.status in {"declined", "done"}:
        approach = existing
        approach.status = "requested"
        approach.decided_at = None
    else:
        approach = Approach(seeker_id=seeker.id, brief_id=brief.id, status="requested")
        db.add(approach)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="approach_create",
        payload={"brief_id": brief.id, "seeker_id": seeker.id},
    )
    db.commit()
    db.refresh(approach)
    return ApproachOut(
        id=approach.id,
        seeker_id=approach.seeker_id,
        brief_id=approach.brief_id,
        status=approach.status,
        created_at=approach.created_at,
        brief_title=brief.title,
    )


@router.post("/approaches/{approach_id}/decide", response_model=ApproachOut)
def decide_approach(
    approach_id: int,
    body: ApproachDecide,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> ApproachOut:
    if persona.role != "company":
        raise HTTPException(status_code=403, detail="Company persona required")
    if body.decision not in {"accepted", "declined"}:
        raise HTTPException(status_code=400, detail="decision must be accepted or declined")

    approach = db.scalar(
        select(Approach)
        .where(Approach.id == approach_id)
        .options(selectinload(Approach.brief).selectinload(Brief.company))
    )
    if approach is None:
        raise HTTPException(status_code=404, detail="Approach not found")

    company = db.scalar(select(Company).where(Company.demo_key == persona.id))
    if company and approach.brief.company_id != company.id:
        raise HTTPException(status_code=403, detail="Not your inbox")

    if approach.status != "requested":
        raise HTTPException(status_code=409, detail="Already decided")

    approach.status = body.decision
    approach.decided_at = datetime.now(timezone.utc)

    if body.decision == "declined":
        db.execute(
            update(Seeker)
            .where(Seeker.id == approach.seeker_id)
            .values(approach_budget_remaining=Seeker.approach_budget_remaining + 1)
        )

    queue = _queue_estimate(db, approach.brief) if body.decision == "accepted" else None
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="approach_decide",
        payload={"approach_id": approach.id, "decision": body.decision},
    )
    db.commit()
    db.refresh(approach)
    return ApproachOut(
        id=approach.id,
        seeker_id=approach.seeker_id,
        brief_id=approach.brief_id,
        status=approach.status,
        created_at=approach.created_at,
        decided_at=approach.decided_at,
        brief_title=approach.brief.title,
        queue_est_minutes=queue.est_minutes if queue else None,
    )


@router.get("/approaches/inbox")
def company_inbox(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[dict]:
    if persona.role != "company":
        raise HTTPException(status_code=403, detail="Company persona required")
    company = db.scalar(select(Company).where(Company.demo_key == persona.id))
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    approaches = db.scalars(
        select(Approach)
        .join(Brief)
        .where(Brief.company_id == company.id)
        .options(
            selectinload(Approach.seeker),
            selectinload(Approach.brief),
        )
        .order_by(Approach.created_at.desc())
    ).all()

    out: list[dict] = []
    for a in approaches:
        story = db.scalar(
            select(SkillStory)
            .where(SkillStory.seeker_id == a.seeker_id, SkillStory.status == "approved")
            .options(selectinload(SkillStory.skills).selectinload(StorySkill.skill))
        )
        story_out = None
        if story:
            story_out = StoryOut(
                id=story.id,
                seeker_id=story.seeker_id,
                status=story.status,
                approved_at=story.approved_at,
                transcript_text=None,
                skills=[
                    StorySkillOut(
                        skill_id=ss.skill_id,
                        label=ss.skill.label,
                        evidence_quote=ss.evidence_quote,
                        seeker_confirmed=ss.seeker_confirmed,
                    )
                    for ss in story.skills
                ],
            )
        out.append(
            {
                "approach": ApproachOut(
                    id=a.id,
                    seeker_id=a.seeker_id,
                    brief_id=a.brief_id,
                    status=a.status,
                    created_at=a.created_at,
                    decided_at=a.decided_at,
                    seeker_alias=a.seeker.alias,
                    brief_title=a.brief.title,
                ),
                "story": story_out,
            }
        )
    return out


@router.get("/queue/{brief_id}", response_model=QueueEstimate)
def queue_for_brief(
    brief_id: int,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> QueueEstimate:
    _ = persona
    brief = db.get(Brief, brief_id)
    if brief is None:
        raise HTTPException(status_code=404, detail="Brief not found")
    return _queue_estimate(db, brief)
