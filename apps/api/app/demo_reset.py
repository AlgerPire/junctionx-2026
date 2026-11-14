"""Reset the synthetic demo to a repeatable state for screen recordings.

    python -m app.demo_reset

Runs the normal seed, then undoes what demo flows change: briefs the demo company
created in an interview, approaches by or to the demo personas, and their budgets.
The `seeker_demo_b` story is left as a draft so it can be reviewed and approved.
"""

from __future__ import annotations

import json

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import Approach, Brief, Company, Followup, Invite, Seeker, SkillStory
from app.seed import SEED, seed
from app.services.audit import write_audit

DEMO_SEEKERS = ("seeker_demo_a", "seeker_demo_b")
DRAFT_STORY_SEEKER = "seeker_demo_b"


def seeded_titles(company_demo_key: str) -> set[str]:
    rows = json.loads((SEED / "briefs.json").read_text(encoding="utf-8"))
    return {r["title"] for r in rows if r.get("company_demo_key") == company_demo_key}


def _delete_approaches(db: Session, approach_ids: list[int]) -> None:
    if approach_ids:
        db.execute(delete(Followup).where(Followup.approach_id.in_(approach_ids)))
        db.execute(delete(Approach).where(Approach.id.in_(approach_ids)))


def _recount_budgets(db: Session, seeker_ids: set[int]) -> None:
    default = get_settings().approach_budget_default
    for seeker in db.scalars(select(Seeker).where(Seeker.id.in_(seeker_ids))).all():
        used = select(func.count()).where(Approach.seeker_id == seeker.id)
        seeker.approach_budget_remaining = max(default - (db.scalar(used) or 0), 0)


def clear_demo_activity(db: Session) -> dict[str, int]:
    company = db.scalar(select(Company).where(Company.demo_key == "company_demo"))
    demo_seekers = db.scalars(select(Seeker).where(Seeker.demo_key.in_(DEMO_SEEKERS))).all()
    company_brief_ids = (
        list(db.scalars(select(Brief.id).where(Brief.company_id == company.id)).all())
        if company
        else []
    )
    keep = seeded_titles("company_demo")
    extra_brief_ids = (
        list(
            db.scalars(
                select(Brief.id).where(Brief.company_id == company.id, Brief.title.not_in(keep))
            ).all()
        )
        if company
        else []
    )
    approaches = db.scalars(
        select(Approach).where(
            Approach.brief_id.in_(company_brief_ids)
            | Approach.seeker_id.in_([s.id for s in demo_seekers])
        )
    ).all()
    touched = {a.seeker_id for a in approaches}
    _delete_approaches(db, [a.id for a in approaches])
    if extra_brief_ids:
        db.execute(delete(Invite).where(Invite.brief_id.in_(extra_brief_ids)))
        for brief in db.scalars(select(Brief).where(Brief.id.in_(extra_brief_ids))).all():
            db.delete(brief)
    db.flush()
    _recount_budgets(db, touched | {s.id for s in demo_seekers})
    db.commit()
    return {"approaches": len(approaches), "briefs": len(extra_brief_ids)}


def set_story_draft(db: Session, demo_key: str) -> None:
    seeker = db.scalar(select(Seeker).where(Seeker.demo_key == demo_key))
    if seeker is None:
        return
    story = db.scalar(select(SkillStory).where(SkillStory.seeker_id == seeker.id))
    if story is not None:
        story.status = "draft"
        story.approved_at = None


def reset_demo() -> dict[str, int]:
    seed()
    db = SessionLocal()
    try:
        removed = clear_demo_activity(db)
    finally:
        db.close()
    seed()  # recreates the synthetic inbox requests
    db = SessionLocal()
    try:
        set_story_draft(db, DRAFT_STORY_SEEKER)
        write_audit(
            db, actor_role="system", actor_id="demo_reset", action="demo_reset", payload=removed
        )
        db.commit()
    finally:
        db.close()
    return removed


if __name__ == "__main__":
    result = reset_demo()
    print(
        f"Demo reset: removed {result['approaches']} approaches "
        f"and {result['briefs']} interview briefs."
    )
