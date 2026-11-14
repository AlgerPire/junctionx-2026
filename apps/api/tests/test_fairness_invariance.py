from app.schemas import BriefView, SeekerSkillView


BANNED = {
    "name",
    "nationality",
    "age",
    "gender",
    "school",
    "university",
    "photo",
    "address",
    "display_name",
}


def test_dto_banned_fields() -> None:
    seeker_fields = set(SeekerSkillView.model_fields)
    brief_fields = set(BriefView.model_fields)
    leaked = (seeker_fields | brief_fields) & BANNED
    assert not leaked, f"Banned fields leaked into matching DTOs: {leaked}"


def test_counterfactual_identity_fields_do_not_exist_on_dto() -> None:
    """Matching DTOs structurally cannot carry name/nationality/school."""
    payload = {
        "seeker_id": 1,
        "skills": [],
        "evidence": {},
        "languages": [],
        "needs_relocation": False,
        "display_name": "should be ignored by model",
        "nationality": "XX",
    }
    view = SeekerSkillView.model_validate(payload)
    dumped = view.model_dump()
    assert "display_name" not in dumped
    assert "nationality" not in dumped
