from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import PersonaContext, resolve_persona, seeker_from_persona
from app.models import AuditLog, Company, User
from app.schemas import AuditEntryOut
from app.services.account_lifecycle import delete_company_data, delete_seeker_data, delete_user_account
from app.services.audit import write_audit

router = APIRouter(prefix="/api", tags=["audit"])


@router.get("/audit", response_model=list[AuditEntryOut])
def list_audit(
    actor: str | None = None,
    action: str | None = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[AuditEntryOut]:
    # Demo and staff can browse; seekers/companies only see their own rows when authenticated.
    stmt = select(AuditLog).order_by(AuditLog.ts.desc()).limit(limit)
    if persona.role in {"seeker", "company"} and persona.auth_mode == "session":
        stmt = stmt.where(AuditLog.actor_id == persona.id)
    if actor:
        stmt = stmt.where(AuditLog.actor_id == actor)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    rows = db.scalars(stmt).all()
    return [
        AuditEntryOut(
            id=r.id,
            ts=r.ts,
            actor_role=r.actor_role,
            actor_id=r.actor_id,
            action=r.action,
            payload=r.payload or {},
        )
        for r in rows
    ]


@router.post("/me/delete")
def delete_my_data(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if persona.user_id:
        user = db.get(User, persona.user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="Account not found")
        summary = delete_user_account(db, user)
        write_audit(
            db,
            actor_role=persona.role,
            actor_id=persona.id,
            action="delete_my_data",
            payload={"mode": "account", **{k: v for k, v in summary.items() if k != "user_id"}},
        )
        db.commit()
        return {"ok": True, "summary": summary}

    if persona.role == "seeker":
        seeker = seeker_from_persona(db, persona)
        summary = delete_seeker_data(db, seeker)
        write_audit(
            db,
            actor_role=persona.role,
            actor_id=persona.id,
            action="delete_my_data",
            payload={"mode": "demo_seeker", **summary},
        )
        db.commit()
        return {"ok": True, "summary": summary}

    if persona.role == "company":
        company_id = persona.company_id
        if company_id is None:
            from app.models import Company as CompanyModel

            company = db.scalar(
                select(CompanyModel).where(CompanyModel.demo_key == persona.id)
            )
        else:
            company = db.get(Company, company_id)
        if company is None:
            raise HTTPException(status_code=404, detail="Company not found")
        summary = delete_company_data(db, company, drafts_only=True)
        write_audit(
            db,
            actor_role=persona.role,
            actor_id=persona.id,
            action="delete_my_data",
            payload={"mode": "demo_company", **summary},
        )
        db.commit()
        return {"ok": True, "summary": summary}

    raise HTTPException(
        status_code=400,
        detail="Only seeker or company accounts can delete their data here",
    )
