"""STT locale helpers: Auto must not send comma-separated language= to Azure."""

from app.services.stt import _CANDIDATE_LOCALES, _is_auto, _locale, candidate_locales


def test_auto_locale_is_single_safe_fallback() -> None:
    # Classic Azure STT language= accepts one locale only.
    assert _locale("auto") == "en-GB"
    assert _locale(None) == "en-GB"
    assert _locale("detect") == "en-GB"


def test_auto_candidates_list_for_fast_transcription() -> None:
    assert candidate_locales("auto") == list(_CANDIDATE_LOCALES)
    assert candidate_locales(None) == list(_CANDIDATE_LOCALES)
    assert "," not in "".join(candidate_locales("auto"))  # never a single joined language=


def test_explicit_locales() -> None:
    assert _locale("fi-FI") == "fi-FI"
    assert _locale("fi") == "fi-FI"
    assert _locale("sv_SE") == "sv-SE"
    assert _locale("uk") == "uk-UA"
    assert candidate_locales("fi-FI") == ["fi-FI"]


def test_is_auto() -> None:
    assert _is_auto(None) is True
    assert _is_auto("auto") is True
    assert _is_auto("AUTO") is True
    assert _is_auto("fi-FI") is False
