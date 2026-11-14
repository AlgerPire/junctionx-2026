from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, seeker_from_persona
from app.models import Skill, SkillStory, StorySkill
from app.schemas import StoryOut, StorySkillOut
from app.services.audit import write_audit

router = APIRouter(prefix="/api/stories", tags=["stories"])


class StoryPatch(BaseModel):
    remove_skill_ids: list[int] | None = None
    add_skills: list[dict] | None = None  # {skill_id, evidence_quote}
    keep_transcript: bool | None = None


def _story_out(story: SkillStory) -> StoryOut:
    return StoryOut(
        id=story.id,
        seeker_id=story.seeker_id,
        status=story.status,
        approved_at=story.approved_at,
        transcript_text=story.transcript_text if story.status != "approved" else None,
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


@router.get("/me", response_model=StoryOut | None)
def my_story(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> StoryOut | None:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    story = db.scalar(
        select(SkillStory)
        .where(SkillStory.seeker_id == seeker.id)
        .options(selectinload(SkillStory.skills).selectinload(StorySkill.skill))
        .order_by(SkillStory.id.desc())
    )
    return _story_out(story) if story else None


@router.patch("/{story_id}", response_model=StoryOut)
def patch_story(
    story_id: int,
    body: StoryPatch,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> StoryOut:
    seeker = seeker_from_persona(db, persona)
    story = db.scalar(
        select(SkillStory)
        .where(SkillStory.id == story_id, SkillStory.seeker_id == seeker.id)
        .options(selectinload(SkillStory.skills).selectinload(StorySkill.skill))
    )
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    if body.keep_transcript is not None:
        story.keep_transcript = body.keep_transcript
    if body.remove_skill_ids:
        story.skills = [ss for ss in story.skills if ss.skill_id not in body.remove_skill_ids]
    if body.add_skills:
        existing = {ss.skill_id for ss in story.skills}
        for item in body.add_skills:
            sid = int(item["skill_id"])
            if sid in existing:
                continue
            skill = db.get(Skill, sid)
            if skill is None:
                continue
            story.skills.append(
                StorySkill(
                    skill_id=sid,
                    evidence_quote=str(item.get("evidence_quote") or "Added by seeker"),
                    seeker_confirmed=True,
                )
            )
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="story_patch",
        payload={
            "story_id": story.id,
            "removed": body.remove_skill_ids or [],
            "added": [int(i["skill_id"]) for i in (body.add_skills or []) if "skill_id" in i],
        },
    )
    db.commit()
    db.refresh(story)
    return _story_out(story)


@router.post("/{story_id}/approve", response_model=StoryOut)
def approve_story(
    story_id: int,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> StoryOut:
    seeker = seeker_from_persona(db, persona)
    story = db.scalar(
        select(SkillStory)
        .where(SkillStory.id == story_id, SkillStory.seeker_id == seeker.id)
        .options(selectinload(SkillStory.skills).selectinload(StorySkill.skill))
    )
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    story.status = "approved"
    story.approved_at = datetime.now(timezone.utc)
    if not story.keep_transcript:
        story.transcript_text = None
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="story_approve",
        payload={"story_id": story.id, "seeker_id": seeker.id},
    )
    db.commit()
    db.refresh(story)
    return _story_out(story)
