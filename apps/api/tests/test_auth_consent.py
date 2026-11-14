"""Phase 1: magic-link auth, consent, deletion (uses DB)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models import Skill, SkillSynonym
from app.services.embeddings import resolve_skill_id


client = TestClient(app)


def test_privacy_notice_multilingual() -> None:
    en = client.get("/api/consent/notice?locale=en")
    fi = client.get("/api/consent/notice?locale=fi")
    assert en.status_code == 200
    assert fi.status_code == 200
    assert "version" in en.json()
    assert fi.json()["title"] != en.json()["title"]


def test_magic_link_consent_and_delete() -> None:
    req = client.post(
        "/api/auth/request-link",
        json={"email": "pilot.seeker@example.com", "role": "seeker", "locale": "en"},
    )
    assert req.status_code == 200
    body = req.json()
    assert body["ok"] is True
    token = body.get("dev_token")
    assert token, "AUTH_EXPOSE_DEV_LINK must be on for tests"

    verified = client.post("/api/auth/verify", json={"token": token})
    assert verified.status_code == 200
    me = verified.json()
    assert me["authenticated"] is True
    assert me["role"] == "seeker"
    assert me["consent_complete"] is False

    status = client.get("/api/consent/status")
    assert status.status_code == 200
    assert status.json()["required"] is True

    notice = client.get("/api/consent/notice").json()
    granted = client.post("/api/consent/grant", json={"purposes": notice["purposes"], "locale": "en"})
    assert granted.status_code == 200
    assert granted.json()["complete"] is True

    me2 = client.get("/api/auth/me")
    assert me2.json()["consent_complete"] is True
    assert me2.json()["onboarding_completed"] is False

    onboarded = client.post("/api/auth/onboarding/complete")
    assert onboarded.status_code == 200
    assert onboarded.json()["onboarding_completed"] is True

    deleted = client.post("/api/me/delete")
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True

    me3 = client.get("/api/auth/me")
    assert me3.json()["authenticated"] is False


def test_demo_persona_still_works() -> None:
    res = client.get("/api/personas", headers={"X-Persona-Id": "organiser_demo"})
    assert res.status_code == 200


def test_synonym_resolution() -> None:
    db = SessionLocal()
    try:
        skill = db.query(Skill).filter(Skill.label == "Python").first()
        if skill is None:
            return
        existing = (
            db.query(SkillSynonym)
            .filter(SkillSynonym.skill_id == skill.id, SkillSynonym.synonym == "python programming")
            .first()
        )
        if existing is None:
            db.add(SkillSynonym(skill_id=skill.id, lang="en", synonym="python programming"))
            db.commit()
        sid = resolve_skill_id(db, "python programming", lang="en")
        assert sid == skill.id
    finally:
        db.close()
