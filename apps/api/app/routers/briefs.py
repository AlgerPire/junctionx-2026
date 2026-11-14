from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona
from app.models import Brief, BriefSkill, Company
from app.schemas import BriefOut, BriefSkillOut, LanguageLevel
from app.services.audit import write_audit

router = APIRouter(prefix="/api/briefs", tags=["briefs"])


class BriefPatch(BaseModel):
    title: str | None = None
    plain_summary: str | None = None
    problem_90_days: str | None = None
    onboarding_support: str | None = None
    relocation_support: bool | None = None
    international_ok: bool | None = None
    work_mode: str | None = None


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


@router.get("", response_model=list[BriefOut])
def list_briefs(
    status: str | None = None,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[BriefOut]:
    stmt = select(Brief).options(
        selectinload(Brief.skills).selectinload(BriefSkill.skill),
        selectinload(Brief.company),
    )
    if persona.role == "company":
        company = db.scalar(select(Company).where(Company.demo_key == persona.id))
        if company is None:
            return []
        stmt = stmt.where(Brief.company_id == company.id)
    else:
        stmt = stmt.where(Brief.status == "published")
    if status:
        stmt = stmt.where(Brief.status == status)
    return [_brief_out(b) for b in db.scalars(stmt).all()]


@router.get("/{brief_id}", response_model=BriefOut)
def get_brief(
    brief_id: int,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> BriefOut:
    _ = persona
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
    return _brief_out(brief)


@router.patch("/{brief_id}", response_model=BriefOut)
def patch_brief(
    brief_id: int,
    body: BriefPatch,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> BriefOut:
    if persona.role != "company":
        raise HTTPException(status_code=403, detail="Company persona required")
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
    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(brief, field, value)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="brief_patch",
        payload={"brief_id": brief.id, "fields": sorted(changes.keys())},
    )
    db.commit()
    db.refresh(brief)
    return _brief_out(brief)


@router.post("/{brief_id}/publish", response_model=BriefOut)
def publish_brief(
    brief_id: int,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> BriefOut:
    if persona.role != "company":
        raise HTTPException(status_code=403, detail="Company persona required")
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
    brief.status = "published"
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="brief_publish",
        payload={"brief_id": brief.id},
    )
    db.commit()
    db.refresh(brief)
    return _brief_out(brief)
