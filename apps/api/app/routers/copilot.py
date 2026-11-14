from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
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
    llm_copilot_answer,
    rule_based_answer,
)
from app.services.embeddings import skill_index

router = APIRouter(prefix="/api", tags=["copilot"])


class HistoryTurn(BaseModel):
    role: str = Field(min_length=1, max_length=32)
    content: str = Field(min_length=1, max_length=2000)


class AskBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    history: list[HistoryTurn] = Field(default_factory=list, max_length=8)


@router.post("/copilot/ask")
async def copilot_ask(
    body: AskBody,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    question = body.text.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Empty question")

    cards = get_my_suggestions(db, seeker, limit=5)
    budget = get_my_budget(seeker)

    queue_minutes: int | None = None
    if cards and any(w in question.lower() for w in ("queue", "wait", "how long")):
        brief = db.get(Brief, cards[0]["brief_id"])
        if brief:
            queue_minutes = int(get_queue_estimate(db, brief).get("est_minutes") or 0)

    # Prefer company mention from suggestions only.
    lowered = question.lower()
    mentioned = next(
        (c for c in cards if c.get("company_name") and str(c["company_name"]).lower() in lowered),
        None,
    )
    if mentioned:
        summary = get_brief_summary(db, mentioned["brief_id"]) or {}
        company = summary.get("company") or mentioned.get("company_name") or "That company"
        answer = (
            f"Here’s a quick read on {company}: {summary.get('summary')} "
            f"Their first-90-days focus is {summary.get('problem_90_days')}. "
            "Open the brief if you want to ask — your call."
        )
        shown = [mentioned]
        sources = [mentioned["brief_id"]]
    else:
        history = [t.model_dump() for t in body.history]
        llm = await llm_copilot_answer(
            question,
            cards=cards,
            budget=budget,
            history=history,
        )
        if llm:
            answer, shown, sources = llm
        else:
            answer, shown, sources = rule_based_answer(
                question,
                cards=cards,
                budget=budget,
                queue_minutes=queue_minutes,
            )

    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="copilot_ask",
        payload={"sources": sources},
    )
    db.commit()
    return {"answer": answer, "cards": shown, "sources": sources}


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
