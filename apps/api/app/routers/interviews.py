from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona
from app.models import Brief, BriefSkill, InterviewSession
from app.schemas import BriefOut, BriefSkillOut, LanguageLevel
from app.services.audit import write_audit
from app.services.brief_builder import create_brief_from_draft, extract_brief_from_conversation
from app.services.candidate_pool import company_for_persona
from app.services.interviewer import EMPTY_BRIEF_DRAFT, next_turn, normalize_lang, opening_line

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


class StartBody(BaseModel):
    kind: str
    owner_id: str
    lang: str | None = None


class TurnBody(BaseModel):
    user_text: str
    lang: str | None = None


class FinalizeBody(BaseModel):
    publish: bool = False


def _brief_out(brief: Brief) -> BriefOut:
    return BriefOut(
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
        company_name=brief.company.name if brief.company else None,
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


@router.post("")
async def start_interview(
    body: StartBody,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if body.kind not in {"brief", "story", "followup"}:
        raise HTTPException(status_code=400, detail="Invalid kind")
    lang = normalize_lang(body.lang)
    first = opening_line(body.kind, lang)
    draft = dict(EMPTY_BRIEF_DRAFT) if body.kind == "brief" else {}
    session = InterviewSession(
        kind=body.kind,
        owner_id=body.owner_id or persona.id,
        messages=[{"role": "assistant", "content": first}],
        draft=draft,
        status="active",
        lang=lang,
    )
    db.add(session)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="interview_start",
        payload={"kind": body.kind, "lang": lang},
    )
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "first_question": first, "draft": draft, "lang": lang}


@router.post("/{session_id}/turn")
async def interview_turn(
    session_id: int,
    body: TurnBody,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    _ = persona
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if body.lang:
        session.lang = normalize_lang(body.lang)
    messages = list(session.messages or [])
    messages.append({"role": "user", "content": body.user_text})
    assistant_text, draft, done = await next_turn(
        kind=session.kind,
        messages=messages,
        draft=dict(session.draft or {}),
        lang=session.lang or "en",
    )
    messages.append({"role": "assistant", "content": assistant_text})
    session.messages = messages
    session.draft = draft
    if done:
        session.status = "done"
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="interview_turn",
        payload={
            "session_id": session.id,
            "kind": session.kind,
            "done": done,
            "lang": session.lang,
        },
    )
    db.commit()
    return {"assistant_text": assistant_text, "draft": draft, "done": done, "lang": session.lang}


@router.post("/{session_id}/finalize")
async def finalize_interview(
    session_id: int,
    body: FinalizeBody | None = None,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    publish = bool(body and body.publish)
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.kind == "brief":
        if persona.role != "company":
            raise HTTPException(status_code=403, detail="Company persona required")
        company = company_for_persona(db, persona.id, persona.company_id)
        if company is None:
            raise HTTPException(status_code=404, detail="Company not found")

        payload = await extract_brief_from_conversation(
            db,
            messages=list(session.messages or []),
            draft=dict(session.draft or {}),
        )
        brief = await create_brief_from_draft(
            db, company=company, payload=payload, publish=publish
        )
        # reload with relations
        brief = db.scalar(
            select(Brief)
            .where(Brief.id == brief.id)
            .options(
                selectinload(Brief.skills).selectinload(BriefSkill.skill),
                selectinload(Brief.company),
            )
        )
        assert brief is not None
        session.draft = {**payload, "brief_id": brief.id, "status": brief.status}
        session.status = "finalized"
        write_audit(
            db,
            actor_role=persona.role,
            actor_id=persona.id,
            action="brief_create_from_interview",
            payload={"brief_id": brief.id, "published": publish},
        )
        if publish:
            write_audit(
                db,
                actor_role=persona.role,
                actor_id=persona.id,
                action="brief_publish",
                payload={"brief_id": brief.id},
            )
        db.commit()
        return {
            **payload,
            "brief_id": brief.id,
            "status": brief.status,
            "brief": _brief_out(brief).model_dump(mode="json"),
        }

    transcript = "\n".join(
        f"{m['role']}: {m['content']}" for m in (session.messages or []) if m.get("content")
    )
    draft = {
        "skills": [],
        "transcript_text": transcript,
        "note": "Review and add skills with evidence quotes before approving.",
    }
    session.draft = draft
    session.status = "finalized"
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="interview_finalize",
        payload={"session_id": session_id, "kind": session.kind},
    )
    db.commit()
    return draft
