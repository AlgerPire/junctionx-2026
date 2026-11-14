from datetime import UTC, datetime

from app.schemas import BriefView, Reason, SkillRef, StorySkillOut
from app.services.candidate_review import must_have_checklist, provenance_notes, review_flags


def _brief() -> BriefView:
    return BriefView(
        brief_id=1,
        title="Analyst",
        must=[
            SkillRef(skill_id=1, label="SQL"),
            SkillRef(skill_id=2, label="Data analysis"),
            SkillRef(skill_id=3, label="Clinical documentation"),
        ],
        learnable=[],
        nice=[],
        required_languages=[],
        relocation_support=False,
        on_site=False,
    )


REASONS = [
    Reason(
        type="direct",
        brief_skill="SQL",
        seeker_skill="SQL",
        evidence_quote="I wrote SQL.",
        text="x",
    ),
    Reason(
        type="transferable",
        brief_skill="Data analysis",
        seeker_skill="Statistics",
        evidence_quote="I ran stats.",
        text="x",
    ),
    Reason(type="consideration", brief_skill="Clinical documentation", text="Not closely covered"),
    Reason(type="consideration", text="The company states fi (B1) is required"),
]


def _skill(label: str, quote: str, confirmed: bool = True) -> StorySkillOut:
    return StorySkillOut(
        skill_id=hash(label) % 1000, label=label, evidence_quote=quote, seeker_confirmed=confirmed
    )


def test_checklist_maps_each_must_have() -> None:
    rows = must_have_checklist(_brief(), REASONS)
    assert [(r.skill, r.status) for r in rows] == [
        ("SQL", "evidenced"),
        ("Data analysis", "related"),
        ("Clinical documentation", "not_evidenced"),
    ]
    assert rows[0].evidence_quote == "I wrote SQL."
    assert rows[2].evidence_quote is None


def test_flags_cover_unconfirmed_short_shared_and_considerations() -> None:
    long_quote = "I built a spreadsheet that tracked delayed discharges for the whole ward team."
    skills = [
        _skill("SQL", "I wrote SQL.", confirmed=False),
        _skill("Data analysis", long_quote),
        _skill("Reporting", long_quote),
    ]
    kinds = [f.kind for f in review_flags(skills, REASONS)]
    assert "unconfirmed_skill" in kinds
    assert "short_evidence" in kinds
    assert "shared_quote" in kinds
    assert "missing_must_have" in kinds
    assert "consideration" in kinds


def test_similar_phrasing_flag_for_templated_quotes() -> None:
    skills = [
        _skill(label, f"I used {label.lower()} in a real project for a client team.")
        for label in ("SQL", "Python", "Dashboarding")
    ]
    kinds = [f.kind for f in review_flags(skills, [])]
    assert "similar_phrasing" in kinds


def test_clean_story_has_no_flags() -> None:
    skills = [
        _skill("SQL", "I wrote the SQL queries behind our monthly hospital capacity report."),
        _skill("Python", "Last spring I automated the rota export with a small Python script."),
    ]
    assert review_flags(skills, []) == []


def test_provenance_mentions_ai_and_confirmation_count() -> None:
    skills = [_skill("SQL", "q", confirmed=True), _skill("Python", "q2", confirmed=False)]
    notes = provenance_notes(skills, datetime(2026, 11, 1, tzinfo=UTC))
    joined = " ".join(notes)
    assert "mapped by AI" in joined
    assert "confirmed 1 of 2" in joined
    assert "01 Nov 2026" in joined
