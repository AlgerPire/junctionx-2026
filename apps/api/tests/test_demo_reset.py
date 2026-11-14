from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.demo_reset import reset_demo, seeded_titles
from app.models import Approach, AuditLog, Brief, Company, Seeker, SkillStory
from app.seed import DEMO_REQUESTS


def _company_and_seekers(db):
    company = db.scalar(select(Company).where(Company.demo_key == "company_demo"))
    seeker_a = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_a"))
    seeker_b = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_b"))
    return company, seeker_a, seeker_b


def test_reset_removes_demo_activity_and_restores_budgets() -> None:
    reset_demo()
    db = SessionLocal()
    try:
        company, seeker_a, _ = _company_and_seekers(db)
        event_id = db.scalar(select(Brief.event_id).where(Brief.company_id == company.id))
        extra = Brief(company_id=company.id, event_id=event_id, title="Interview-made brief (test)")
        db.add(extra)
        db.flush()
        db.add(Approach(seeker_id=seeker_a.id, brief_id=extra.id, status="requested"))
        seeker_a.approach_budget_remaining = 1
        db.commit()
    finally:
        db.close()

    reset_demo()

    db = SessionLocal()
    try:
        company, seeker_a, seeker_b = _company_and_seekers(db)
        titles = set(db.scalars(select(Brief.title).where(Brief.company_id == company.id)).all())
        assert titles == seeded_titles("company_demo")
        assert seeker_a.approach_budget_remaining == get_settings().approach_budget_default
        assert not db.scalars(select(Approach).where(Approach.seeker_id == seeker_a.id)).all()
        story = db.scalar(select(SkillStory).where(SkillStory.seeker_id == seeker_b.id))
        assert story is not None and story.status == "draft" and story.skills
        inbox = db.scalars(select(Approach).where(Approach.status == "requested")).all()
        assert len([a for a in inbox if a.brief.company_id == company.id]) == 3
        assert db.scalar(select(AuditLog).where(AuditLog.action == "demo_reset")) is not None
    finally:
        db.close()


def test_reset_is_repeatable() -> None:
    reset_demo()
    again = reset_demo()
    assert again == {"approaches": len(DEMO_REQUESTS), "briefs": 0}
