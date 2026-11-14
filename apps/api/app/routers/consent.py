from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.deps import PersonaContext, resolve_persona
from app.models import ConsentRecord
from app.services.audit import write_audit
from app.services.auth_tokens import utcnow
from app.services.consent import CONSENT_PURPOSES, active_consents, has_required_consent, privacy_notice

router = APIRouter(prefix="/api/consent", tags=["consent"])


class ConsentGrantIn(BaseModel):
    purposes: list[str] = Field(default_factory=lambda: list(CONSENT_PURPOSES))
    locale: str = "en"


@router.get("/notice")
def get_notice(locale: str = "en") -> dict:
    return privacy_notice(locale)


@router.get("/status")
def consent_status(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if not persona.user_id:
        return {
            "required": False,
            "complete": True,
            "consents": {p: True for p in CONSENT_PURPOSES},
            "version": get_settings().privacy_notice_version,
            "mode": "demo",
        }
    return {
        "required": True,
        "complete": has_required_consent(db, persona.user_id),
        "consents": active_consents(db, persona.user_id),
        "version": get_settings().privacy_notice_version,
        "mode": "session",
    }


@router.post("/grant")
def grant_consent(
    body: ConsentGrantIn,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if not persona.user_id:
        return {"ok": True, "mode": "demo", "complete": True}
    version = get_settings().privacy_notice_version
    purposes = body.purposes or list(CONSENT_PURPOSES)
    for purpose in purposes:
        if purpose not in CONSENT_PURPOSES:
            raise HTTPException(status_code=400, detail=f"Unknown purpose: {purpose}")
        existing = db.scalar(
            select(ConsentRecord).where(
                ConsentRecord.user_id == persona.user_id,
                ConsentRecord.purpose == purpose,
                ConsentRecord.version == version,
            )
        )
        if existing:
            existing.withdrawn_at = None
            existing.granted_at = utcnow()
        else:
            db.add(
                ConsentRecord(
                    user_id=persona.user_id,
                    purpose=purpose,
                    version=version,
                )
            )
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="consent_grant",
        payload={"purposes": purposes, "version": version, "locale": body.locale},
    )
    db.commit()
    return {
        "ok": True,
        "complete": has_required_consent(db, persona.user_id),
        "consents": active_consents(db, persona.user_id),
    }


@router.post("/withdraw")
def withdraw_consent(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    if not persona.user_id:
        return {"ok": True, "mode": "demo"}
    version = get_settings().privacy_notice_version
    rows = db.scalars(
        select(ConsentRecord).where(
            ConsentRecord.user_id == persona.user_id,
            ConsentRecord.version == version,
            ConsentRecord.withdrawn_at.is_(None),
        )
    ).all()
    for row in rows:
        row.withdrawn_at = utcnow()
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="consent_withdraw",
        payload={"version": version, "count": len(rows)},
    )
    db.commit()
    return {"ok": True, "complete": False, "consents": active_consents(db, persona.user_id)}
