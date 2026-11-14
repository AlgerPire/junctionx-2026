from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, seeker_from_persona
from app.models import Approach, Followup
from app.services.audit import write_audit
from app.services.llm import LLMError, chat_json

router = APIRouter(prefix="/api/followups", tags=["followups"])


class FollowupCreate(BaseModel):
    approach_id: int
    text: str


def _heuristic_extract(text: str) -> dict:
    remind = None
    lower = text.lower()
    if "tomorrow" in lower:
        remind = 1
    elif "week" in lower:
        remind = 7
    elif "monday" in lower or "next week" in lower:
        remind = 7
    return {
        "summary": text.strip()[:240],
        "next_step": "Follow up as noted in your voice note.",
        "remind_in_days": remind,
    }


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
        select(Approach).where(Approach.id == body.approach_id, Approach.seeker_id == seeker.id)
    )
    if approach is None:
        raise HTTPException(status_code=404, detail="Approach not found")

    structured = _heuristic_extract(body.text)
    try:
        from pathlib import Path

        prompt = (Path(__file__).resolve().parents[1] / "prompts" / "followup_extract.md").read_text(
            encoding="utf-8"
        )
        result = await chat_json(system=prompt, user=body.text)
        structured = {
            "summary": str(result.get("summary") or structured["summary"]),
            "next_step": str(result.get("next_step") or structured["next_step"]),
            "remind_in_days": result.get("remind_in_days"),
        }
    except LLMError:
        pass

    row = Followup(
        approach_id=approach.id,
        voice_note_text=body.text,
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
        .options(selectinload(Approach.brief))
    ).all()
    out: list[dict] = []
    for a in approaches:
        fus = db.scalars(select(Followup).where(Followup.approach_id == a.id)).all()
        for fu in fus:
            out.append(
                {
                    "id": fu.id,
                    "approach_id": a.id,
                    "brief_title": a.brief.title if a.brief else None,
                    "structured": fu.structured,
                    "created_at": fu.created_at,
                }
            )
    return out
