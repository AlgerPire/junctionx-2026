from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, seeker_from_persona, to_seeker_skill_view
from app.models import Brief, Company, Invite, Seeker
from app.schemas import InviteOut
from app.services.audit import write_audit
from app.services.candidate_pool import company_for_persona

router = APIRouter(prefix="/api/invites", tags=["invites"])


class InviteCreate(BaseModel):
    brief_id: int
    seeker_id: int
    message: str = Field(default="", max_length=1000)
    proposed_slot: str = Field(default="", max_length=120)


class InviteRespond(BaseModel):
    decision: Literal["accepted", "declined"]


def invite_out(invite: Invite) -> InviteOut:
    return InviteOut(
        id=invite.id,
        brief_id=invite.brief_id,
        seeker_id=invite.seeker_id,
        status=invite.status,  # type: ignore[arg-type]
        message=invite.message,
        proposed_slot=invite.proposed_slot,
        created_at=invite.created_at,
        responded_at=invite.responded_at,
        brief_title=invite.brief.title,
        company_name=invite.brief.company.name if invite.brief.company else None,
        seeker_alias=invite.seeker.alias,
        seeker_display_name=invite.seeker.display_name if invite.status == "accepted" else None,
    )


def _load_invite(db: Session, invite_id: int) -> Invite:
    invite = db.scalar(
        select(Invite)
        .where(Invite.id == invite_id)
        .options(
            selectinload(Invite.seeker),
            selectinload(Invite.brief).selectinload(Brief.company),
        )
    )
    if invite is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return invite


def _require_company(db: Session, persona: PersonaContext) -> Company:
    if persona.role != "company":
        raise HTTPException(status_code=403, detail="Company persona required")
    company = company_for_persona(db, persona.id, persona.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("", response_model=InviteOut)
def create_invite(
    body: InviteCreate,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> InviteOut:
    company = _require_company(db, persona)
    brief = db.get(Brief, body.brief_id)
    if brief is None or brief.company_id != company.id:
        raise HTTPException(status_code=404, detail="Brief not found")
    if brief.status != "published":
        raise HTTPException(status_code=409, detail="Publish the brief before inviting candidates")
    seeker = db.get(Seeker, body.seeker_id)
    if seeker is None or to_seeker_skill_view(db, seeker) is None:
        raise HTTPException(status_code=404, detail="Candidate has no approved skill story")

    invite = db.scalar(
        select(Invite).where(Invite.seeker_id == seeker.id, Invite.brief_id == brief.id)
    )
    if invite is not None and invite.status in {"invited", "accepted"}:
        return invite_out(_load_invite(db, invite.id))
    if invite is None:
        invite = Invite(seeker_id=seeker.id, brief_id=brief.id)
        db.add(invite)
    invite.status = "invited"
    invite.message = body.message.strip()
    invite.proposed_slot = body.proposed_slot.strip()
    invite.responded_at = None
    db.flush()
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="invite_create",
        payload={"invite_id": invite.id, "brief_id": brief.id, "seeker_id": seeker.id},
    )
    db.commit()
    return invite_out(_load_invite(db, invite.id))


@router.get("/company", response_model=list[InviteOut])
def company_invites(
    brief_id: int | None = None,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[InviteOut]:
    company = _require_company(db, persona)
    stmt = (
        select(Invite)
        .join(Brief)
        .where(Brief.company_id == company.id)
        .options(
            selectinload(Invite.seeker),
            selectinload(Invite.brief).selectinload(Brief.company),
        )
        .order_by(Invite.created_at.desc())
    )
    if brief_id is not None:
        stmt = stmt.where(Invite.brief_id == brief_id)
    return [invite_out(i) for i in db.scalars(stmt).all()]


@router.post("/{invite_id}/withdraw", response_model=InviteOut)
def withdraw_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> InviteOut:
    company = _require_company(db, persona)
    invite = _load_invite(db, invite_id)
    if invite.brief.company_id != company.id:
        raise HTTPException(status_code=403, detail="Not your invitation")
    if invite.status != "invited":
        raise HTTPException(status_code=409, detail="Only pending invitations can be withdrawn")
    invite.status = "withdrawn"
    invite.responded_at = datetime.now(UTC)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="invite_withdraw",
        payload={"invite_id": invite.id},
    )
    db.commit()
    return invite_out(_load_invite(db, invite.id))


@router.get("/me", response_model=list[InviteOut])
def my_invites(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[InviteOut]:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    invites = db.scalars(
        select(Invite)
        .where(Invite.seeker_id == seeker.id, Invite.status != "withdrawn")
        .options(
            selectinload(Invite.seeker),
            selectinload(Invite.brief).selectinload(Brief.company),
        )
        .order_by(Invite.created_at.desc())
    ).all()
    return [invite_out(i) for i in invites]


@router.post("/{invite_id}/respond", response_model=InviteOut)
def respond_invite(
    invite_id: int,
    body: InviteRespond,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> InviteOut:
    if persona.role != "seeker":
        raise HTTPException(status_code=403, detail="Seeker persona required")
    seeker = seeker_from_persona(db, persona)
    invite = _load_invite(db, invite_id)
    if invite.seeker_id != seeker.id:
        raise HTTPException(status_code=403, detail="Not your invitation")
    if invite.status != "invited":
        raise HTTPException(status_code=409, detail="Already answered")
    invite.status = body.decision
    invite.responded_at = datetime.now(UTC)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="invite_respond",
        payload={"invite_id": invite.id, "decision": body.decision},
    )
    db.commit()
    return invite_out(_load_invite(db, invite.id))
