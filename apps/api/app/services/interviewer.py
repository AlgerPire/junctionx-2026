from __future__ import annotations

from pathlib import Path
from typing import Any

from app.services.llm import LLMError, chat_json

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"

BRIEF_FALLBACK = [
    "Thanks — what should this person actually get done in the first 90 days?",
    "Got it. Which skills must they already have to start, in concrete terms?",
    "What would you be happy for them to learn on the job?",
    "Which languages do they need to work in, and roughly at what level?",
    "Are international candidates welcome — and is there relocation or onboarding support?",
    "Last practical bit: is this on-site, hybrid, or remote?",
]

STORY_FALLBACK = [
    "Tell me about something you built, fixed or organised that you are proud of. What did you do yourself?",
    "Describe a time you learned something new quickly. What did you learn and how?",
    "Tell me about a task where you worked with other people. What was your part?",
    "Which languages do you work in, and at what level?",
]

EMPTY_BRIEF_DRAFT: dict[str, Any] = {
    "title": "",
    "plain_summary": "",
    "problem_90_days": "",
    "must_skills": [],
    "learnable_skills": [],
    "nice_skills": [],
    "required_languages": [],
    "international_ok": None,
    "relocation_support": None,
    "onboarding_support": "",
    "work_mode": "",
    "missing": ["role purpose", "90-day problem", "must-have skills"],
    "clarifications_asked": [],
}


def _load_prompt(name: str) -> str:
    path = PROMPTS / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def _merge_draft(base: dict[str, Any], update: dict[str, Any] | None) -> dict[str, Any]:
    out = {**EMPTY_BRIEF_DRAFT, **(base or {})}
    if not update:
        return out
    for key, value in update.items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip() and out.get(key):
            continue
        if isinstance(value, list) and not value and out.get(key):
            continue
        out[key] = value
    return out


def _critical_missing(draft: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    if not draft.get("title") and not draft.get("plain_summary"):
        missing.append("what the role is for")
    if not draft.get("problem_90_days"):
        missing.append("the first 90-day problem")
    if not draft.get("must_skills"):
        missing.append("must-have skills")
    if not draft.get("work_mode"):
        missing.append("work mode")
    return missing


async def next_turn(
    *,
    kind: str,
    messages: list[dict[str, str]],
    draft: dict[str, Any],
) -> tuple[str, dict[str, Any], bool]:
    turns = sum(1 for m in messages if m.get("role") == "user")
    fallback = BRIEF_FALLBACK if kind == "brief" else STORY_FALLBACK
    soft_limit = 8 if kind == "brief" else 5
    hard_limit = 10 if kind == "brief" else 8

    system = _load_prompt(
        "interviewer_brief.md" if kind == "brief" else "interviewer_story.md"
    ) or "Ask one short clarifying question. Return JSON {assistant_text, done, draft}."

    try:
        result = await chat_json(
            system=system,
            user=json_dumps(
                {
                    "messages": messages,
                    "current_draft": draft or EMPTY_BRIEF_DRAFT,
                    "kind": kind,
                    "user_turns": turns,
                    "instruction": (
                        "Continue the conversation. Acknowledge the latest answer. "
                        "If something is missing or unclear, ask about that. "
                        "Update draft."
                    ),
                }
            ),
        )
        text = str(
            result.get("assistant_text")
            or fallback[min(turns, len(fallback) - 1)]
        ).strip()
        merged = _merge_draft(draft, result.get("draft") if isinstance(result.get("draft"), dict) else None)
        done = bool(result.get("done"))
        if turns >= hard_limit:
            done = True
        elif turns >= soft_limit and not _critical_missing(merged):
            done = True
        if done and kind == "brief" and "enough" not in text.lower() and "draft" not in text.lower():
            gaps = _critical_missing(merged)
            if gaps:
                done = False
                text = (
                    f"Almost there — I still need a bit more on {gaps[0]}. "
                    f"Could you clarify that?"
                )
            else:
                text = (
                    "Perfect — I have enough to draft a job listing from this. "
                    "You can review it on the right and list it when you're happy."
                )
        return text, merged, done
    except LLMError:
        merged = draft or dict(EMPTY_BRIEF_DRAFT)
        if turns >= len(fallback):
            return (
                "Thanks — I have enough to draft a listing. Review it on the right, then list the job when ready.",
                merged,
                True,
            )
        return fallback[turns], merged, False


def opening_line(kind: str) -> str:
    if kind == "brief":
        return (
            "Hi — let's draft a job listing together. "
            "In plain words, what are you hiring for, and what problem should this person solve?"
        )
    return "Tell me about something you built, fixed or organised that you are proud of. What did you do yourself?"


def json_dumps(obj: Any) -> str:
    import json

    return json.dumps(obj, ensure_ascii=False)
