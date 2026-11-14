from app.schemas import BriefView, LanguageLevel, SeekerSkillView, SkillRef
from app.services.matching import match, rank_suggestions


def _sim_factory(pairs: dict[tuple[int, int], float]):
    def sim(a: int, b: int) -> float:
        if a == b:
            return 1.0
        return pairs.get((a, b), pairs.get((b, a), 0.0))

    return sim


def test_direct_match_strong() -> None:
    seeker = SeekerSkillView(
        seeker_id=1,
        skills=[SkillRef(skill_id=1, label="Python")],
        evidence={1: "I wrote Python scripts to clean discharge data."},
        languages=[LanguageLevel(lang="en", level="B2")],
        needs_relocation=False,
    )
    brief = BriefView(
        brief_id=10,
        title="Analyst",
        must=[SkillRef(skill_id=1, label="Python")],
        learnable=[],
        nice=[],
        required_languages=[],
        relocation_support=True,
        on_site=False,
    )
    sug, coverage = match(seeker, brief, _sim_factory({}))
    assert sug is not None
    assert sug.bucket == "strong"
    assert coverage == 1.0
    assert sug.reasons[0].type == "direct"
    assert sug.reasons[0].evidence_quote is not None
    assert sug.overview
    assert sug.fit_summary
    assert "Python" in sug.fit_summary


def test_transferable_hidden_gem() -> None:
    # Clinical documentation transfers to health data literacy
    sim = _sim_factory({(2, 3): 0.78})
    seeker = SeekerSkillView(
        seeker_id=2,
        skills=[SkillRef(skill_id=2, label="Clinical documentation")],
        evidence={2: "I wrote the daily clinical notes myself."},
        languages=[LanguageLevel(lang="fi", level="C1")],
        needs_relocation=False,
    )
    brief = BriefView(
        brief_id=11,
        title="Health data",
        must=[SkillRef(skill_id=3, label="Health data literacy")],
        learnable=[SkillRef(skill_id=1, label="Python")],
        nice=[],
        required_languages=[LanguageLevel(lang="en", level="B2")],
        relocation_support=True,
        on_site=False,
    )
    sug, coverage = match(seeker, brief, sim)
    assert sug is not None
    assert sug.bucket in {"good", "explore", "strong"}
    assert any(r.type == "transferable" for r in sug.reasons)
    assert any(r.type == "consideration" for r in sug.reasons)
    assert any(r.type == "learnable_gap" for r in sug.reasons)


def test_no_match_below_explore() -> None:
    seeker = SeekerSkillView(
        seeker_id=3,
        skills=[SkillRef(skill_id=9, label="Bookkeeping")],
        evidence={9: "I reconciled invoices monthly."},
        languages=[],
        needs_relocation=False,
    )
    brief = BriefView(
        brief_id=12,
        title="Cloud security",
        must=[
            SkillRef(skill_id=20, label="Cloud security"),
            SkillRef(skill_id=21, label="Secrets management"),
        ],
        learnable=[],
        nice=[],
        required_languages=[],
        relocation_support=False,
        on_site=False,
    )
    sug, coverage = match(seeker, brief, _sim_factory({}))
    assert sug is None
    assert coverage < 0.3


def test_deterministic_ordering() -> None:
    from app.schemas import Suggestion, Reason

    a = Suggestion(
        brief_id=1,
        seeker_id=1,
        bucket="good",
        reasons=[Reason(type="direct", text="a")],
        data_used=[],
    )
    b = Suggestion(
        brief_id=2,
        seeker_id=1,
        bucket="good",
        reasons=[Reason(type="direct", text="b")],
        data_used=[],
    )
    r1 = rank_suggestions([(a, 0.5), (b, 0.5)], event_id=1)
    r2 = rank_suggestions([(b, 0.5), (a, 0.5)], event_id=1)
    assert [s.brief_id for s in r1] == [s.brief_id for s in r2]
