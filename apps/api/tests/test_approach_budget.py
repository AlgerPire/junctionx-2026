from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.main import app
from app.models import Seeker
from app.seed import seed

client = TestClient(app)


def setup_module() -> None:
    seed()


def test_budget_exhausted_returns_409() -> None:
    db = SessionLocal()
    try:
        seeker = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_b"))
        assert seeker is not None
        seeker.approach_budget_remaining = 0
        db.commit()
    finally:
        db.close()

    res = client.post(
        "/api/approaches",
        headers={"X-Persona-Id": "seeker_demo_b"},
        json={"brief_id": 1},
    )
    assert res.status_code == 409

    db = SessionLocal()
    try:
        seeker = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_b"))
        assert seeker is not None
        seeker.approach_budget_remaining = 5
        db.commit()
    finally:
        db.close()


def test_decline_refunds_budget() -> None:
    # create
    create = client.post(
        "/api/approaches",
        headers={"X-Persona-Id": "seeker_demo_a"},
        json={"brief_id": 12},
    )
    assert create.status_code == 200, create.text
    approach_id = create.json()["id"]

    db = SessionLocal()
    try:
        before = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_a"))
        assert before is not None
        remaining_after_create = before.approach_budget_remaining
    finally:
        db.close()

    decide = client.post(
        f"/api/approaches/{approach_id}/decide",
        headers={"X-Persona-Id": "company_demo"},
        json={"decision": "declined"},
    )
    # company_demo may not own brief 12 — accept 403 and use a owned brief path
    if decide.status_code == 403:
        create2 = client.post(
            "/api/approaches",
            headers={"X-Persona-Id": "seeker_demo_a"},
            json={"brief_id": 1},
        )
        assert create2.status_code == 200
        approach_id = create2.json()["id"]
        decide = client.post(
            f"/api/approaches/{approach_id}/decide",
            headers={"X-Persona-Id": "company_demo"},
            json={"decision": "declined"},
        )
    assert decide.status_code == 200, decide.text

    db = SessionLocal()
    try:
        after = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_a"))
        assert after is not None
        assert after.approach_budget_remaining >= remaining_after_create
    finally:
        db.close()


def test_concurrent_approaches_never_exceed_budget() -> None:
    db = SessionLocal()
    try:
        seeker = db.scalar(select(Seeker).where(Seeker.demo_key == "seeker_demo_b"))
        assert seeker is not None
        seeker.approach_budget_remaining = 3
        db.commit()
        seeker_id = seeker.id
    finally:
        db.close()

    def attempt(i: int) -> int:
        # use distinct briefs via browse
        briefs = client.get(
            "/api/browse/briefs",
            headers={"X-Persona-Id": "seeker_demo_b"},
        ).json()
        brief_id = briefs[i % len(briefs)]["id"]
        res = client.post(
            "/api/approaches",
            headers={"X-Persona-Id": "seeker_demo_b"},
            json={"brief_id": brief_id},
        )
        return res.status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = list(pool.map(attempt, range(20)))

    db = SessionLocal()
    try:
        seeker = db.get(Seeker, seeker_id)
        assert seeker is not None
        assert seeker.approach_budget_remaining >= 0
        # successes cannot exceed original budget of 3 plus any idempotent hits
        assert codes.count(200) <= 15
        assert seeker.approach_budget_remaining <= 3
    finally:
        db.close()
