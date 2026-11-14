from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, seeker_from_persona, to_seeker_skill_view
from app.models import Brief, BriefSkill
from app.services.audit import write_audit
from app.services.copilot_tools import (
    get_brief_summary,
    get_my_budget,
    get_my_suggestions,
    get_queue_estimate,
)
from app.services.embeddings import skill_index

router = APIRouter(prefix="/api", tags=["copilot"])


class AskBody(BaseModel):
    text: str


@router.post("/copilot/ask")
def copilot_ask(
    body: AskBody,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    text = body.text.lower()

    cards = get_my_suggestions(db, seeker, limit=5)
    budget = get_my_budget(seeker)
    sources = [c["brief_id"] for c in cards[:3]]

    if "budget" in text:
        answer = (
            f"You have {budget['remaining']} of {budget['total']} approach points left. "
            "Use them on conversations you care about most."
        )
    elif "queue" in text or "wait" in text:
        if cards:
            brief = db.get(Brief, cards[0]["brief_id"])
            est = get_queue_estimate(db, brief) if brief else {"est_minutes": 0}
            answer = (
                f"For {cards[0].get('company_name')}, estimated wait is about "
                f"{est.get('est_minutes', 0)} minutes based on accepted conversations and tables."
            )
            sources = [cards[0]["brief_id"]]
        else:
            answer = "I do not have queue data yet because there are no suggested conversations."
            sources = []
    elif "next" in text or "who" in text or "talk" in text or "suggest" in text:
        if not cards:
            answer = (
                "I do not have suggestions yet. Approve a skill story first, "
                "or browse all briefs — nothing is hidden."
            )
            sources = []
        else:
            top = cards[0]
            answer = (
                f"A strong next conversation is {top.get('company_name')} "
                f"({top.get('bucket')}). Reason: {top['reasons'][0]['text'] if top.get('reasons') else 'skill overlap'}. "
                "You decide whether to ask."
            )
            sources = [top["brief_id"]]
            cards = cards[:3]
    else:
        # Try to match a mentioned company name from tool results only
        mentioned = next(
            (c for c in cards if c.get("company_name") and c["company_name"].lower() in text),
            None,
        )
        if mentioned:
            summary = get_brief_summary(db, mentioned["brief_id"])
            answer = (
                f"{summary['company']}: {summary['summary']} "
                f"First 90 days: {summary['problem_90_days']}"
            )
            sources = [mentioned["brief_id"]]
            cards = [mentioned]
        elif cards:
            answer = (
                f"Based on your approved skill story, start with {cards[0].get('company_name')}. "
                "Open Why? to see the evidence. I never rank people or decide for you."
            )
            sources = [cards[0]["brief_id"]]
            cards = cards[:2]
        else:
            answer = "I can only use your suggestions and brief summaries — no invented companies."
            sources = []
            cards = []

    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="copilot_ask",
        payload={"sources": sources},
    )
    db.commit()
    return {"answer": answer, "cards": cards, "sources": sources}


@router.get("/briefing")
def briefing(
    brief_id: int = Query(...),
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    view = to_seeker_skill_view(db, seeker)
    brief = db.scalar(
        select(Brief)
        .where(Brief.id == brief_id)
        .options(
            selectinload(Brief.skills).selectinload(BriefSkill.skill),
            selectinload(Brief.company),
        )
    )
    if brief is None:
        raise HTTPException(status_code=404, detail="Brief not found")

    shared: list[str] = []
    if view:
        for bs in brief.skills:
            for s in view.skills:
                if skill_index.sim(bs.skill_id, s.skill_id) >= 0.7:
                    shared.append(s.label)
                    break
    shared = list(dict.fromkeys(shared))[:5]
    questions = [
        f"How do you support someone learning {brief.skills[0].skill.label} on the job?"
        if brief.skills
        else "What does success look like in the first 90 days?",
        "What does onboarding look like for someone new to your domain?",
    ]
    common = (
        f"You share evidenced skills around {', '.join(shared)}."
        if shared
        else "Use the published brief skills as your starting point for the conversation."
    )
    return {"shared_skills": shared, "questions": questions, "notes": common}
