import asyncio

import pytest

from app.services import interviewer
from app.services.interviewer import (
    TOPIC_QUESTIONS,
    contextual_fallback,
    covered_topics,
    next_turn,
    normalize_lang,
    opening_line,
    snippet,
)
from app.services.llm import LLMError


def _conv(*user_texts: str) -> list[dict[str, str]]:
    messages = [{"role": "assistant", "content": opening_line("brief")}]
    for text in user_texts:
        messages.append({"role": "user", "content": text})
    return messages


def test_normalize_lang_accepts_locale_codes() -> None:
    assert normalize_lang("fi-FI") == "fi"
    assert normalize_lang("sv-SE") == "sv"
    assert normalize_lang("uk-UA") == "uk"
    assert normalize_lang("de-DE") == "en"
    assert normalize_lang(None) == "en"


def test_opening_line_is_localised() -> None:
    assert opening_line("brief", "fi") != opening_line("brief", "en")
    assert "Hei" in opening_line("brief", "fi")
    assert "Hej" in opening_line("brief", "sv")


def test_snippet_truncates_long_answers() -> None:
    assert snippet("one two three", max_words=5) == "one two three"
    assert snippet("a b c d e f g h i j k", max_words=3) == "a b c…"


def test_fallback_quotes_latest_answer_and_skips_covered_topics() -> None:
    messages = _conv("A data analyst who must know SQL to fix our energy reporting in 90 days")
    text, done = contextual_fallback("brief", messages, "en")
    assert not done
    assert "A data analyst who must know SQL" in text
    covered = covered_topics("brief", messages)
    assert {"problem_90_days", "must_skills"} <= covered
    assert TOPIC_QUESTIONS["problem_90_days"]["en"] not in text
    assert TOPIC_QUESTIONS["must_skills"]["en"] not in text


def test_fallback_answers_in_selected_language() -> None:
    text, _ = contextual_fallback("brief", _conv("Tarvitsemme data-analyytikon"), "fi")
    assert "Kiitos" in text
    assert "Tarvitsemme data-analyytikon" in text


def test_fallback_wraps_up_when_all_topics_covered() -> None:
    messages = _conv(
        "In 90 days they must fix reporting; they need SQL experience",
        "They can learn Python on the job; English is the working language",
        "International candidates welcome, relocation help, hybrid work",
    )
    text, done = contextual_fallback("brief", messages, "en")
    assert done
    assert "enough" in text


def test_story_fallback_digs_into_short_answers() -> None:
    messages = [{"role": "assistant", "content": opening_line("story")}]
    messages.append({"role": "user", "content": "I fixed the ward rota"})
    text, done = contextual_fallback("story", messages, "en")
    assert not done
    assert "I fixed the ward rota" in text
    assert "what did you do yourself" in text.lower()


def test_next_turn_uses_contextual_fallback_when_llm_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    async def boom(**_: object) -> dict:
        raise LLMError("offline")

    monkeypatch.setattr(interviewer, "chat_json", boom)
    text, _, done = asyncio.run(
        next_turn(kind="brief", messages=_conv("Behöver en utvecklare"), draft={}, lang="sv")
    )
    assert not done
    assert "Tack" in text
    assert "Behöver en utvecklare" in text


def test_next_turn_passes_reply_language_to_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, str] = {}

    async def fake(*, system: str, user: str, **_: object) -> dict:
        seen["user"] = user
        return {"assistant_text": "Hyvä, kerro lisää.", "done": False, "draft": {}}

    monkeypatch.setattr(interviewer, "chat_json", fake)
    text, _, _ = asyncio.run(
        next_turn(kind="brief", messages=_conv("Tarvitsemme kehittäjän"), draft={}, lang="fi")
    )
    assert text == "Hyvä, kerro lisää."
    assert "Finnish" in seen["user"]
    assert "Tarvitsemme kehittäjän" in seen["user"]
