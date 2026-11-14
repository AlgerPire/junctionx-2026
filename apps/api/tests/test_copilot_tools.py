from __future__ import annotations

from app.services.copilot_tools import rule_based_answer


def _cards() -> list[dict]:
    return [
        {
            "brief_id": 1,
            "company_name": "Nordic Labs",
            "bucket": "strong",
            "reasons": [{"type": "skill", "text": "shared Python evidence"}],
        },
        {
            "brief_id": 2,
            "company_name": "Harbor Soft",
            "bucket": "good",
            "reasons": [{"type": "skill", "text": "shared facilitation evidence"}],
        },
        {
            "brief_id": 3,
            "company_name": "Lake Works",
            "bucket": "explore",
            "reasons": [{"type": "skill", "text": "adjacent product skills"}],
        },
    ]


def test_rule_based_budget_intent() -> None:
    answer, shown, sources = rule_based_answer(
        "How many approaches do I have left?",
        cards=_cards(),
        budget={"remaining": 3, "total": 5},
    )
    assert "3" in answer and "5" in answer
    assert "approach" in answer.lower() or "budget" in answer.lower()
    assert shown
    assert sources


def test_rule_based_next_varies_by_question() -> None:
    cards = _cards()
    a1, shown1, _ = rule_based_answer(
        "Who should I talk to next?",
        cards=cards,
        budget={"remaining": 4, "total": 5},
    )
    a2, shown2, _ = rule_based_answer(
        "Who should I meet after lunch?",
        cards=cards,
        budget={"remaining": 4, "total": 5},
    )
    assert "Nordic Labs" in a1 or "Harbor Soft" in a1 or "Lake Works" in a1
    assert shown1 and shown2
    # Different phrasings should not always produce identical canned text.
    assert a1 != a2 or shown1[0]["brief_id"] != shown2[0]["brief_id"]


def test_rule_based_prepare_names_a_company() -> None:
    answer, shown, sources = rule_based_answer(
        "What should I prepare?",
        cards=_cards(),
        budget={"remaining": 2, "total": 5},
    )
    assert "prepare" in answer.lower() or "Before" in answer
    assert len(shown) == 1
    assert sources == [shown[0]["brief_id"]]


def test_rule_based_empty_cards() -> None:
    answer, shown, sources = rule_based_answer(
        "Who next?",
        cards=[],
        budget={"remaining": 5, "total": 5},
    )
    assert "Approve" in answer or "browse" in answer.lower()
    assert shown == []
    assert sources == []
