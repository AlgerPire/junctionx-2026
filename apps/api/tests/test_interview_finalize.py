import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.main import app
from app.models import AuditLog, Company
from app.seed import seed
from app.services import brief_builder
from app.services.llm import LLMError

client = TestClient(app)
COMPANY = {"X-Persona-Id": "company_demo"}
SEEKER = {"X-Persona-Id": "seeker_demo_a"}


def setup_module() -> None:
    seed()


@pytest.fixture(autouse=True)
def offline_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    async def boom(*_: object, **__: object) -> dict:
        raise LLMError("offline")

    monkeypatch.setattr(brief_builder, "chat_json", boom)
    monkeypatch.setattr(brief_builder, "map_skills_from_transcript", boom)


def _session(headers: dict[str, str]) -> int:
    res = client.post(
        "/api/interviews",
        headers=headers,
        json={"kind": "brief", "owner_id": headers["X-Persona-Id"], "lang": "en"},
    )
    assert res.status_code == 200, res.text
    return int(res.json()["session_id"])


def _demo_company_id() -> int:
    db = SessionLocal()
    try:
        company = db.scalar(select(Company).where(Company.demo_key == "company_demo"))
        assert company is not None
        return company.id
    finally:
        db.close()


def _audit_count(action: str) -> int:
    db = SessionLocal()
    try:
        return len(db.scalars(select(AuditLog).where(AuditLog.action == action)).all())
    finally:
        db.close()


def test_finalize_brief_requires_company_persona() -> None:
    sid = _session(COMPANY)
    res = client.post(f"/api/interviews/{sid}/finalize", headers=SEEKER, json={"publish": True})
    assert res.status_code == 403


def test_finalize_publishes_for_demo_company() -> None:
    sid = _session(COMPANY)
    before = _audit_count("brief_publish")
    res = client.post(f"/api/interviews/{sid}/finalize", headers=COMPANY, json={"publish": True})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "published"
    assert body["brief"]["company_id"] == _demo_company_id()
    assert _audit_count("brief_publish") == before + 1


def test_finalize_resolves_company_by_id_persona() -> None:
    company_id = _demo_company_id()
    headers = {"X-Persona-Id": f"company:{company_id}"}
    sid = _session(headers)
    res = client.post(f"/api/interviews/{sid}/finalize", headers=headers, json={"publish": False})
    assert res.status_code == 200, res.text
    assert res.json()["brief"]["company_id"] == company_id

    listed = client.get("/api/briefs", headers=headers).json()
    assert any(b["id"] == res.json()["brief_id"] for b in listed)
