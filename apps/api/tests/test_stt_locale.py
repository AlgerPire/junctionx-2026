"""STT locale helpers: Auto must not fall back to a single browser-like default."""

from app.services.stt import _CANDIDATE_LOCALES, _is_auto, _locale


def test_auto_locale_lists_supported_candidates() -> None:
    joined = _locale("auto")
    for code in _CANDIDATE_LOCALES:
        assert code in joined
    assert _locale(None) == joined
    assert _locale("detect") == joined


def test_explicit_locales() -> None:
    assert _locale("fi-FI") == "fi-FI"
    assert _locale("fi") == "fi-FI"
    assert _locale("sv_SE") == "sv-SE"
    assert _locale("uk") == "uk-UA"


def test_is_auto() -> None:
    assert _is_auto(None) is True
    assert _is_auto("auto") is True
    assert _is_auto("AUTO") is True
    assert _is_auto("fi-FI") is False
