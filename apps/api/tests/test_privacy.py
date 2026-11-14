from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.main import app
from app.models import Seeker, SkillStory
from app.seed import seed

client = TestClient(app)


def setup_module() -> None:
    seed()


def test_approved_story_has_no_transcript() -> None:
    db = SessionLocal()
    try:
        seeker = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_a"))
        assert seeker is not None
        story = db.scalar(
            select(SkillStory).where(SkillStory.seeker_id == seeker.id, SkillStory.status == "approved")
        )
        assert story is not None
        assert story.transcript_text is None
    finally:
        db.close()


def test_company_suggestions_use_alias_not_display_name() -> None:
    briefs = client.get("/api/briefs", headers={"X-Persona-Id": "company_demo"}).json()
    assert briefs
    brief_id = briefs[0]["id"]
    suggestions = client.get(
        f"/api/suggestions/brief/{brief_id}",
        headers={"X-Persona-Id": "company_demo"},
    ).json()
    for s in suggestions:
        assert "display_name" not in s
        assert s.get("seeker_alias")
        assert "Aino" not in (s.get("seeker_alias") or "")
