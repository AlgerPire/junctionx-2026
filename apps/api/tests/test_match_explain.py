from app.schemas import Reason
from app.services.match_explain import build_overview


def test_overview_includes_fit_and_gaps() -> None:
    reasons = [
        Reason(
            type="direct",
            brief_skill="Python",
            seeker_skill="Python",
            evidence_quote="I wrote Python scripts.",
            text="Evidence of Python in their own words",
        ),
        Reason(
            type="consideration",
            text="The company states Finnish (B1) is required",
        ),
        Reason(
            type="learnable_gap",
            brief_skill="SQL",
            text="SQL can be learned on the job according to the company",
        ),
    ]
    fit, gaps, overview = build_overview(
        bucket="good",
        reasons=reasons,
        coverage=0.75,
        perspective="seeker",
    )
    assert "good conversation" in fit.lower() or "good" in fit.lower()
    assert "Python" in fit
    assert gaps is not None
    assert "Finnish" in gaps or "SQL" in gaps
    assert "you decide" in overview.lower()
    assert "75%" in overview


def test_company_perspective_wording() -> None:
    reasons = [
        Reason(
            type="direct",
            brief_skill="Team coordination",
            seeker_skill="Team coordination",
            text="Evidence of Team coordination in their own words",
        )
    ]
    fit, gaps, overview = build_overview(
        bucket="strong",
        reasons=reasons,
        coverage=1.0,
        perspective="company",
    )
    assert "their approved story" in fit
    assert gaps is None
    assert "strong fit" in fit.lower()
    assert overview
