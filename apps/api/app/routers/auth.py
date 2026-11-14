from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.deps import SESSION_COOKIE, PersonaContext, optional_persona
from app.models import AuthSession, MagicLink, User
from app.services.account_lifecycle import ensure_company_for_user, ensure_seeker_for_user
from app.services.audit import write_audit
from app.services.auth_tokens import hash_token, magic_link_expiry, new_token, session_expiry, utcnow
from app.services.consent import active_consents, has_required_consent, privacy_notice

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

ALLOWED_SIGNUP_ROLES = {"seeker", "company", "organiser", "advisor"}


class RequestLinkIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    role: str = Field(default="seeker")
    locale: str = Field(default="en")


class VerifyIn(BaseModel):
    token: str


class MeOut(BaseModel):
    authenticated: bool
    auth_mode: str | None = None
    user_id: int | None = None
    email: str | None = None
    role: str | None = None
    company_id: int | None = None
    seeker_id: int | None = None
    company_verified: bool | None = None
    consent_complete: bool = False
    onboarding_completed: bool = False
    consents: dict[str, bool] = Field(default_factory=dict)
    privacy_version: str | None = None
    demo_allowed: bool = True
    session_token: str | None = None


@router.post("/request-link")
def request_magic_link(body: RequestLinkIn, db: Session = Depends(get_db)) -> dict:
    email = body.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    role = body.role.strip().lower()
    if role not in ALLOWED_SIGNUP_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {sorted(ALLOWED_SIGNUP_ROLES)}")

    settings = get_settings()
    raw = new_token()
    db.add(
        MagicLink(
            email=email,
            role=role,
            token_hash=hash_token(raw),
            expires_at=magic_link_expiry(),
        )
    )
    write_audit(
        db,
        actor_role=role,
        actor_id=email,
        action="auth_request_link",
        payload={"email": email, "role": role, "locale": body.locale},
    )
    db.commit()

    verify_url = f"{settings.app_public_url.rstrip('/')}/auth/verify?token={raw}"
    logger.info("Magic link for %s (%s): %s", email, role, verify_url)
    print(f"[First: Skill!] Magic link for {email}: {verify_url}", flush=True)

    out: dict = {
        "ok": True,
        "message": "Check your email for a sign-in link. In this prototype the link also appears below.",
        "role": role,
    }
    if settings.auth_expose_dev_link:
        out["dev_link"] = verify_url
        out["dev_token"] = raw
    return out


@router.post("/verify")
def verify_magic_link(
    body: VerifyIn,
    response: Response,
    db: Session = Depends(get_db),
) -> MeOut:
    token_hash = hash_token(body.token)
    link = db.scalar(select(MagicLink).where(MagicLink.token_hash == token_hash))
    if link is None or link.used_at is not None or link.expires_at <= utcnow():
        raise HTTPException(status_code=400, detail="Sign-in link is invalid or expired")

    link.used_at = utcnow()
    user = db.scalar(select(User).where(User.email == link.email))
    is_new = user is None
    if user is None:
        user = User(
            email=link.email,
            role=link.role,
            locale="en",
            status="active",
            onboarding_completed=False,
        )
        db.add(user)
        db.flush()
    elif user.status != "active":
        raise HTTPException(status_code=403, detail="Account is not active")

    # Keep role from link for first account creation only
    if is_new:
        user.role = link.role

    if user.role == "seeker":
        ensure_seeker_for_user(db, user)
    elif user.role == "company":
        ensure_company_for_user(db, user)

    user.last_login_at = utcnow()
    raw_session = new_token()
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_token(raw_session),
            expires_at=session_expiry(),
        )
    )
    write_audit(
        db,
        actor_role=user.role,
        actor_id=f"user:{user.id}",
        action="auth_login",
        payload={"email": user.email, "new_user": is_new},
    )
    db.commit()
    db.refresh(user)

    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=raw_session,
        httponly=True,
        samesite="lax",
        max_age=settings.auth_session_hours * 3600,
        path="/",
    )
    me = _me_from_user(db, user)
    # SPA on another port needs the token in the body for Authorization header fallback
    me.session_token = raw_session
    return me


@router.post("/logout")
def logout(
    response: Response,
    db: Session = Depends(get_db),
    persona: PersonaContext | None = Depends(optional_persona),
) -> dict:
    if persona and persona.user_id and persona.auth_mode == "session":
        for row in db.scalars(
            select(AuthSession).where(
                AuthSession.user_id == persona.user_id,
                AuthSession.revoked_at.is_(None),
            )
        ).all():
            row.revoked_at = utcnow()
        write_audit(
            db,
            actor_role=persona.role,
            actor_id=persona.id,
            action="auth_logout",
            payload={},
        )
        db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me", response_model=MeOut)
def me(
    db: Session = Depends(get_db),
    persona: PersonaContext | None = Depends(optional_persona),
) -> MeOut:
    settings = get_settings()
    if persona is None:
        return MeOut(authenticated=False, demo_allowed=bool(settings.auth_allow_demo))
    if persona.user_id:
        user = db.get(User, persona.user_id)
        if user:
            return _me_from_user(db, user)
    return MeOut(
        authenticated=True,
        auth_mode="demo",
        role=persona.role,
        company_id=persona.company_id,
        seeker_id=persona.seeker_id,
        consent_complete=True,
        onboarding_completed=True,
        consents={p: True for p in privacy_notice()["purposes"]},
        privacy_version=settings.privacy_notice_version,
        demo_allowed=bool(settings.auth_allow_demo),
    )


@router.post("/onboarding/complete")
def complete_onboarding(
    db: Session = Depends(get_db),
    persona: PersonaContext | None = Depends(optional_persona),
) -> MeOut:
    if persona is None or not persona.user_id:
        raise HTTPException(status_code=401, detail="Sign in required")
    user = db.get(User, persona.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Account not found")
    user.onboarding_completed = True
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="onboarding_complete",
        payload={"role": user.role},
    )
    db.commit()
    db.refresh(user)
    return _me_from_user(db, user)


def _me_from_user(db: Session, user: User) -> MeOut:
    settings = get_settings()
    consents = active_consents(db, user.id)
    return MeOut(
        authenticated=True,
        auth_mode="session",
        user_id=user.id,
        email=user.email,
        role=user.role,
        company_id=user.company_id,
        seeker_id=user.seeker_id,
        company_verified=user.company_verified,
        consent_complete=has_required_consent(db, user.id),
        onboarding_completed=bool(user.onboarding_completed),
        consents=consents,
        privacy_version=settings.privacy_notice_version,
        demo_allowed=bool(settings.auth_allow_demo),
    )
