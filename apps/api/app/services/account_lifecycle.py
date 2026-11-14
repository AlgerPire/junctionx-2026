"""Create linked seeker/company rows for new accounts; full data deletion."""

from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Approach,
    AuthSession,
    Brief,
    Company,
    ConsentRecord,
    Followup,
    InterviewSession,
    MagicLink,
    Seeker,
    SkillStory,
    User,
)


def ensure_seeker_for_user(db: Session, user: User) -> Seeker:
    if user.seeker_id:
        seeker = db.get(Seeker, user.seeker_id)
        if seeker:
            return seeker
    budget = get_settings().approach_budget_default
    alias = f"Seeker #{secrets.token_hex(2).upper()}"
    seeker = Seeker(
        alias=alias,
        display_name=alias,
        languages=[{"lang": "en", "level": "B2"}],
        needs_relocation=False,
        availability="event_day",
        approach_budget_total=budget,
        approach_budget_remaining=budget,
        demo_key=None,
    )
    db.add(seeker)
    db.flush()
    user.seeker_id = seeker.id
    return seeker


def ensure_company_for_user(db: Session, user: User) -> Company:
    if user.company_id:
        company = db.get(Company, user.company_id)
        if company:
            return company
    company = Company(
        name=f"Company ({user.email.split('@')[0]})",
        sector="unspecified",
        size_band="1-10",
        description="Awaiting advisor verification.",
        demo_key=None,
    )
    db.add(company)
    db.flush()
    user.company_id = company.id
    user.company_verified = False
    return company


def delete_seeker_data(db: Session, seeker: Seeker) -> dict[str, int]:
    counts = {"stories": 0, "approaches": 0, "followups": 0, "interviews": 0}
    for story in db.scalars(select(SkillStory).where(SkillStory.seeker_id == seeker.id)).all():
        db.delete(story)
        counts["stories"] += 1
    for approach in db.scalars(select(Approach).where(Approach.seeker_id == seeker.id)).all():
        for fu in db.scalars(select(Followup).where(Followup.approach_id == approach.id)).all():
            db.delete(fu)
            counts["followups"] += 1
        db.delete(approach)
        counts["approaches"] += 1
    owner_keys = [f"seeker:{seeker.id}"]
    if seeker.demo_key:
        owner_keys.append(seeker.demo_key)
    for session in db.scalars(
        select(InterviewSession).where(InterviewSession.owner_id.in_(owner_keys))
    ).all():
        db.delete(session)
        counts["interviews"] += 1
    db.delete(seeker)
    return counts


def delete_company_data(db: Session, company: Company, *, drafts_only: bool = True) -> dict[str, int]:
    counts = {"briefs": 0, "interviews": 0}
    briefs = list(db.scalars(select(Brief).where(Brief.company_id == company.id)).all())
    for brief in briefs:
        if drafts_only and brief.status == "published":
            continue
        db.delete(brief)
        counts["briefs"] += 1
    owner_keys = [f"company:{company.id}"]
    if company.demo_key:
        owner_keys.append(company.demo_key)
    for session in db.scalars(
        select(InterviewSession).where(InterviewSession.owner_id.in_(owner_keys))
    ).all():
        db.delete(session)
        counts["interviews"] += 1
    return counts


def delete_user_account(db: Session, user: User) -> dict[str, object]:
    summary: dict[str, object] = {"user_id": user.id, "role": user.role}
    if user.seeker_id:
        seeker = db.get(Seeker, user.seeker_id)
        if seeker:
            summary["seeker"] = delete_seeker_data(db, seeker)
            user.seeker_id = None
    if user.company_id and user.role == "company":
        company = db.get(Company, user.company_id)
        if company:
            summary["company"] = delete_company_data(db, company, drafts_only=False)
            # Keep company row if other contacts exist; otherwise remove
            others = db.scalar(
                select(User).where(User.company_id == company.id, User.id != user.id)
            )
            if others is None:
                db.delete(company)
            user.company_id = None
    for session in list(user.sessions):
        db.delete(session)
    for consent in list(user.consents):
        db.delete(consent)
    for link in db.scalars(select(MagicLink).where(MagicLink.email == user.email)).all():
        db.delete(link)
    for session in db.scalars(select(AuthSession).where(AuthSession.user_id == user.id)).all():
        db.delete(session)
    for consent in db.scalars(select(ConsentRecord).where(ConsentRecord.user_id == user.id)).all():
        db.delete(consent)
    db.delete(user)
    return summary
