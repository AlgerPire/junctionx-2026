from __future__ import annotations

from collections import Counter
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, seeker_from_persona
from app.models import Approach, Brief, Followup
from app.services.audit import write_audit
from app.services.llm import LLMError, chat_json

router = APIRouter(prefix="/api/followups", tags=["followups"])

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"


class FollowupCreate(BaseModel):
    approach_id: int
    text: str = Field(min_length=1, max_length=4000)


def _heuristic_extract(text: str) -> dict:
    remind = None
    lower = text.lower()
    if "tomorrow" in lower:
        remind = 1
    elif "next week" in lower or "monday" in lower:
        remind = 7
    elif "week" in lower:
        remind = 7
    return {
        "summary": text.strip()[:240],
        "next_step": "Follow up as noted in your voice note.",
        "remind_in_days": remind,
    }


def _approach_payload(approach: Approach) -> dict:
    brief = approach.brief
    company = brief.company if brief else None
    return {
        "approach_id": approach.id,
        "brief_id": approach.brief_id,
        "brief_title": brief.title if brief else None,
        "company_name": company.name if company else None,
        "status": approach.status,
    }


@router.get("/conversations")
def list_followup_conversations(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[dict]:
    """Conversations the seeker can leave a post-chat note about."""
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    approaches = db.scalars(
        select(Approach)
        .where(Approach.seeker_id == seeker.id)
        .options(selectinload(Approach.brief).selectinload(Brief.company))
        .order_by(Approach.created_at.desc())
    ).all()
    ids = [a.id for a in approaches]
    counts: Counter[int] = Counter()
    if ids:
        for fu in db.scalars(select(Followup).where(Followup.approach_id.in_(ids))).all():
            counts[fu.approach_id] += 1

    out: list[dict] = []
    for a in approaches:
        payload = _approach_payload(a)
        payload["followup_count"] = counts.get(a.id, 0)
        out.append(payload)
    return out


@router.post("")
async def create_followup(
    body: FollowupCreate,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    approach = db.scalar(
        select(Approach)
        .where(Approach.id == body.approach_id, Approach.seeker_id == seeker.id)
        .options(selectinload(Approach.brief).selectinload(Brief.company))
    )
    if approach is None:
        raise HTTPException(status_code=404, detail="Approach not found")

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty note")

    structured = _heuristic_extract(text)
    try:
        prompt = (PROMPTS / "followup_extract.md").read_text(encoding="utf-8")
        result = await chat_json(system=prompt, user=text, temperature=0.3)
        remind = result.get("remind_in_days")
        if remind is not None:
            try:
                remind = int(remind)
            except (TypeError, ValueError):
                remind = structured["remind_in_days"]
        structured = {
            "summary": str(result.get("summary") or structured["summary"]).strip()[:400],
            "next_step": str(result.get("next_step") or structured["next_step"]).strip()[:400],
            "remind_in_days": remind,
        }
    except LLMError:
        pass

    row = Followup(
        approach_id=approach.id,
        voice_note_text=text,
        structured=structured,
    )
    db.add(row)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="followup_create",
        payload={"approach_id": approach.id},
    )
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "approach_id": row.approach_id,
        "brief_title": approach.brief.title if approach.brief else None,
        "company_name": approach.brief.company.name if approach.brief and approach.brief.company else None,
        "voice_note_text": row.voice_note_text,
        "structured": row.structured,
        "created_at": row.created_at,
    }


@router.get("")
def list_followups(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[dict]:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    approaches = db.scalars(
        select(Approach)
        .where(Approach.seeker_id == seeker.id)
        .options(selectinload(Approach.brief).selectinload(Brief.company))
    ).all()
    by_id = {a.id: a for a in approaches}
    if not by_id:
        return []
    fus = db.scalars(
        select(Followup)
        .where(Followup.approach_id.in_(by_id.keys()))
        .order_by(Followup.created_at.desc())
    ).all()
    out: list[dict] = []
    for fu in fus:
        a = by_id[fu.approach_id]
        out.append(
            {
                "id": fu.id,
                "approach_id": a.id,
                "brief_title": a.brief.title if a.brief else None,
                "company_name": a.brief.company.name if a.brief and a.brief.company else None,
                "structured": fu.structured or {},
                "voice_note_text": fu.voice_note_text,
                "created_at": fu.created_at,
            }
        )
    return out
