from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.seed import seed

client = TestClient(app)


def setup_module() -> None:
    seed()


def test_audit_returns_paginated_page() -> None:
    res = client.get(
        "/api/audit",
        headers={"X-Persona-Id": "organiser_demo"},
        params={"limit": 5, "offset": 0},
    )
    assert res.status_code == 200
    body = res.json()
    assert "items" in body
    assert "total" in body
    assert body["limit"] == 5
    assert body["offset"] == 0
    assert isinstance(body["items"], list)
    assert len(body["items"]) <= 5


def test_audit_offset_page() -> None:
    first = client.get(
        "/api/audit",
        headers={"X-Persona-Id": "organiser_demo"},
        params={"limit": 3, "offset": 0},
    ).json()
    second = client.get(
        "/api/audit",
        headers={"X-Persona-Id": "organiser_demo"},
        params={"limit": 3, "offset": 3},
    ).json()
    if first["total"] > 3 and first["items"] and second["items"]:
        assert first["items"][0]["id"] != second["items"][0]["id"]
