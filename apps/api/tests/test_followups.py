from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.db import SessionLocal
from app.main import app
from app.models import Approach, Brief, Followup, Seeker
from app.seed import seed

client = TestClient(app)


def setup_module() -> None:
    seed()


def _headers(demo_key: str = "seeker_demo_a") -> dict[str, str]:
    return {"X-Persona-Id": demo_key}


def test_list_conversations_for_seeker() -> None:
    res = client.get("/api/followups/conversations", headers=_headers())
    assert res.status_code == 200
    rows = res.json()
    assert isinstance(rows, list)
    if rows:
        assert "approach_id" in rows[0]
        assert "company_name" in rows[0] or rows[0].get("brief_title")


def test_create_followup_from_owned_approach() -> None:
    conv = client.get("/api/followups/conversations", headers=_headers())
    assert conv.status_code == 200
    targets = conv.json()
    if not targets:
        # Ensure at least one approach exists for the demo seeker.
        db = SessionLocal()
        try:
            seeker = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_a"))
            brief = db.scalar(select(Brief).where(Brief.status == "published"))
            assert seeker is not None and brief is not None
            existing = db.scalar(
                select(Approach).where(
                    Approach.seeker_id == seeker.id, Approach.brief_id == brief.id
                )
            )
            if existing is None:
                db.add(Approach(seeker_id=seeker.id, brief_id=brief.id, status="accepted"))
                db.commit()
        finally:
            db.close()
        targets = client.get("/api/followups/conversations", headers=_headers()).json()

    assert targets
    approach_id = targets[0]["approach_id"]

    # Clean prior notes for a stable assertion.
    db = SessionLocal()
    try:
        db.execute(delete(Followup).where(Followup.approach_id == approach_id))
        db.commit()
    finally:
        db.close()

    created = client.post(
        "/api/followups",
        headers=_headers(),
        json={
            "approach_id": approach_id,
            "text": "Great chat about clinical data. Send my CV next week and ask about tooling.",
        },
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["approach_id"] == approach_id
    assert body["structured"]["summary"]
    assert body["structured"]["next_step"]

    listed = client.get("/api/followups", headers=_headers())
    assert listed.status_code == 200
    assert any(f["id"] == body["id"] for f in listed.json())


def test_create_followup_wrong_approach_404() -> None:
    res = client.post(
        "/api/followups",
        headers=_headers(),
        json={"approach_id": 999999, "text": "Hello"},
    )
    assert res.status_code == 404
