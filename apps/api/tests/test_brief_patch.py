from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.main import app
from app.models import AuditLog
from app.seed import seed

client = TestClient(app)
COMPANY = {"X-Persona-Id": "company_demo"}


def setup_module() -> None:
    seed()


def _brief() -> dict:
    return client.get("/api/briefs", headers=COMPANY).json()[0]


def _last_audit(action: str) -> AuditLog | None:
    db = SessionLocal()
    try:
        stmt = select(AuditLog).where(AuditLog.action == action).order_by(AuditLog.id.desc())
        return db.scalar(stmt)
    finally:
        db.close()


def test_patch_changes_skill_importance_and_audits() -> None:
    brief = _brief()
    must = next(s for s in brief["skills"] if s["importance"] == "must")

    res = client.patch(
        f"/api/briefs/{brief['id']}",
        headers=COMPANY,
        json={"skill_importance": [{"skill_id": must["skill_id"], "importance": "learnable"}]},
    )

    assert res.status_code == 200, res.text
    changed = next(s for s in res.json()["skills"] if s["skill_id"] == must["skill_id"])
    assert changed["importance"] == "learnable"
    audit = _last_audit("brief_patch")
    assert audit is not None
    expected = [{"skill_id": must["skill_id"], "importance": "learnable"}]
    assert audit.payload["skill_importance"] == expected
    seed()


def test_patch_rejects_skills_outside_the_brief() -> None:
    brief = _brief()
    res = client.patch(
        f"/api/briefs/{brief['id']}",
        headers=COMPANY,
        json={"skill_importance": [{"skill_id": 999_999, "importance": "nice"}]},
    )
    assert res.status_code == 422


def test_patch_rejects_unknown_importance() -> None:
    brief = _brief()
    skill_id = brief["skills"][0]["skill_id"]
    res = client.patch(
        f"/api/briefs/{brief['id']}",
        headers=COMPANY,
        json={"skill_importance": [{"skill_id": skill_id, "importance": "critical"}]},
    )
    assert res.status_code == 422


def test_patch_requires_company_persona() -> None:
    brief = _brief()
    res = client.patch(
        f"/api/briefs/{brief['id']}",
        headers={"X-Persona-Id": "seeker_demo_a"},
        json={"skill_importance": []},
    )
    assert res.status_code == 403


def test_list_briefs_newest_first() -> None:
    listed = client.get("/api/briefs", headers=COMPANY).json()
    assert len(listed) >= 1
    created = [b.get("created_at") or "" for b in listed]
    assert created == sorted(created, reverse=True)
