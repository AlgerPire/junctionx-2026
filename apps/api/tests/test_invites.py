from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.db import SessionLocal
from app.main import app
from app.models import AuditLog, Invite, Seeker
from app.seed import seed

client = TestClient(app)
COMPANY = {"X-Persona-Id": "company_demo"}
SEEKER = {"X-Persona-Id": "seeker_demo_b"}


def setup_module() -> None:
    seed()


def _ids() -> tuple[int, int]:
    brief_id = client.get("/api/briefs", headers=COMPANY).json()[0]["id"]
    db = SessionLocal()
    try:
        seeker = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_b"))
        assert seeker is not None
        db.execute(delete(Invite).where(Invite.seeker_id == seeker.id, Invite.brief_id == brief_id))
        db.commit()
        return brief_id, seeker.id
    finally:
        db.close()


def _audit_count(action: str) -> int:
    db = SessionLocal()
    try:
        return len(db.scalars(select(AuditLog).where(AuditLog.action == action)).all())
    finally:
        db.close()


def test_invite_flow_reveals_name_only_after_acceptance() -> None:
    brief_id, seeker_id = _ids()
    before = _audit_count("invite_create")

    res = client.post(
        "/api/invites",
        headers=COMPANY,
        json={
            "brief_id": brief_id,
            "seeker_id": seeker_id,
            "message": "Hi!",
            "proposed_slot": "14:00",
        },
    )
    assert res.status_code == 200, res.text
    invite = res.json()
    assert invite["status"] == "invited"
    assert invite["seeker_display_name"] is None
    assert _audit_count("invite_create") == before + 1

    again = client.post(
        "/api/invites", headers=COMPANY, json={"brief_id": brief_id, "seeker_id": seeker_id}
    )
    assert again.json()["id"] == invite["id"]

    mine = client.get("/api/invites/me", headers=SEEKER).json()
    assert any(i["id"] == invite["id"] and i["message"] == "Hi!" for i in mine)

    answered = client.post(
        f"/api/invites/{invite['id']}/respond", headers=SEEKER, json={"decision": "accepted"}
    )
    assert answered.status_code == 200, answered.text

    listed = client.get(f"/api/invites/company?brief_id={brief_id}", headers=COMPANY).json()
    row = next(i for i in listed if i["id"] == invite["id"])
    assert row["status"] == "accepted"
    assert row["seeker_display_name"]

    twice = client.post(
        f"/api/invites/{invite['id']}/respond", headers=SEEKER, json={"decision": "declined"}
    )
    assert twice.status_code == 409


def test_company_can_withdraw_pending_invite() -> None:
    brief_id, seeker_id = _ids()
    invite = client.post(
        "/api/invites", headers=COMPANY, json={"brief_id": brief_id, "seeker_id": seeker_id}
    ).json()
    res = client.post(f"/api/invites/{invite['id']}/withdraw", headers=COMPANY)
    assert res.status_code == 200
    assert res.json()["status"] == "withdrawn"
    mine = client.get("/api/invites/me", headers=SEEKER).json()
    assert all(i["id"] != invite["id"] for i in mine)


def test_seeker_cannot_create_invites() -> None:
    brief_id, seeker_id = _ids()
    res = client.post(
        "/api/invites", headers=SEEKER, json={"brief_id": brief_id, "seeker_id": seeker_id}
    )
    assert res.status_code == 403


def test_candidate_review_is_alias_only_with_checklist() -> None:
    brief_id, _ = _ids()
    rows = client.get(f"/api/company/briefs/{brief_id}/candidates", headers=COMPANY).json()
    assert rows
    for row in rows:
        assert row["suggestion"]["seeker_alias"]
        assert "display_name" not in row["suggestion"]
        assert row["must_haves"]
        assert row["provenance"]
        assert all(s["evidence_quote"] for s in row["skills"])


def test_brief_stats_cover_every_company_brief() -> None:
    briefs = client.get("/api/briefs", headers=COMPANY).json()
    stats = client.get("/api/company/briefs/stats", headers=COMPANY).json()
    assert {s["brief_id"] for s in stats} == {b["id"] for b in briefs}
    for s in stats:
        assert set(s["candidates"]) == {"strong", "good", "explore"}
        assert set(s["requests"]) == {"requested", "accepted", "declined"}
