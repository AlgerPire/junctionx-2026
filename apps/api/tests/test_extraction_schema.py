from app.services.skill_mapper import quote_is_substring


def test_quote_must_be_substring() -> None:
    transcript = "I built a simple spreadsheet that tracked delayed discharges."
    assert quote_is_substring("tracked delayed discharges", transcript)
    assert not quote_is_substring("I am a genius engineer", transcript)


def test_invalid_skill_ids_dropped_conceptually() -> None:
    # Validation contract: only candidate ids + substring quotes survive.
    candidates = {1, 2, 3}
    returned = [
        {"skill_id": 1, "evidence_quote": "tracked delayed discharges"},
        {"skill_id": 99, "evidence_quote": "tracked delayed discharges"},
        {"skill_id": 2, "evidence_quote": "invented quote not in text"},
    ]
    transcript = "I built a simple spreadsheet that tracked delayed discharges."
    kept = [
        r
        for r in returned
        if r["skill_id"] in candidates and quote_is_substring(r["evidence_quote"], transcript)
    ]
    assert kept == [{"skill_id": 1, "evidence_quote": "tracked delayed discharges"}]
