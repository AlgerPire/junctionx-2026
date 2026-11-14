from __future__ import annotations

import hashlib
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.deps import load_published_briefs, to_brief_view, to_seeker_skill_view
from app.models import Brief, Seeker
from app.services.embeddings import skill_index
from app.services.llm import LLMError, chat_json
from app.services.matching import match, rank_suggestions

PROMPTS = Path(__file__).resolve().parent.parent / "prompts"


def get_my_suggestions(db: Session, seeker: Seeker, limit: int = 5) -> list[dict]:
    view = to_seeker_skill_view(db, seeker)
    if view is None:
        return []
    briefs = load_published_briefs(db)
    eid = briefs[0].event_id if briefs else 0
    scored = []
    for brief in briefs:
        sug, coverage = match(view, to_brief_view(brief), skill_index.sim, event_id=eid)
        if sug:
            sug.company_name = brief.company.name
            sug.brief_summary = brief.plain_summary
            scored.append((sug, coverage))
    ranked = rank_suggestions(scored, event_id=eid)[:limit]
    return [s.model_dump() for s in ranked]


def get_brief_summary(db: Session, brief_id: int) -> dict | None:
    briefs = {b.id: b for b in load_published_briefs(db)}
    brief = briefs.get(brief_id)
    if brief is None:
        return None
    return {
        "brief_id": brief.id,
        "title": brief.title,
        "company": brief.company.name,
        "summary": brief.plain_summary,
        "problem_90_days": brief.problem_90_days,
    }


def get_queue_estimate(db: Session, brief: Brief) -> dict:
    from app.routers.approaches import queue_estimate

    est = queue_estimate(db, brief)
    return est.model_dump()


def get_my_budget(seeker: Seeker) -> dict:
    return {
        "remaining": seeker.approach_budget_remaining,
        "total": seeker.approach_budget_total,
    }


def _card_blurb(card: dict) -> str:
    reasons = card.get("reasons") or []
    reason = reasons[0]["text"] if reasons else "skill overlap with the published brief"
    return (
        f"{card.get('company_name') or 'A company'} "
        f"({card.get('bucket', 'explore')}): {reason}"
    )


def _intent(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ("budget", "approach left", "approaches left", "points")):
        return "budget"
    if "approach" in t and any(w in t for w in ("left", "remain", "how many", "budget")):
        return "budget"
    if any(w in t for w in ("queue", "wait", "how long")):
        return "queue"
    if any(w in t for w in ("prepare", "prep", "question", "ask them", "brief me", "ready")):
        return "prepare"
    if any(w in t for w in ("strongest", "best", "top", "strong")):
        return "strongest"
    if any(w in t for w in ("next", "who", "talk", "suggest", "recommend", "meet")):
        return "next"
    return "general"


def rule_based_answer(
    question: str,
    *,
    cards: list[dict],
    budget: dict,
    queue_minutes: int | None = None,
) -> tuple[str, list[dict], list[int]]:
    """Varied, intent-aware replies without an LLM. Never invent companies."""
    intent = _intent(question)
    # Stable but question-dependent pick so similar asks do not always name the same card.
    seed = int(hashlib.sha1(question.strip().lower().encode()).hexdigest()[:8], 16)

    if intent == "budget":
        remaining, total = budget["remaining"], budget["total"]
        variants = [
            (
                f"You have {remaining} of {total} approaches left. "
                "Use them on chats you actually want — I only suggest."
            ),
            (
                f"Approach budget: {remaining} remaining (of {total}). "
                "Pick carefully; nothing here decides for you."
            ),
            (
                f"{remaining} approaches still available out of {total}. "
                "I can point at briefs, but you choose whom to ask."
            ),
        ]
        answer = variants[seed % len(variants)]
        return answer, cards[:2], [c["brief_id"] for c in cards[:2]]

    if not cards:
        answer = (
            "I do not have suggestions yet. Approve a skill story first, "
            "or browse every brief — nothing is hidden."
        )
        return answer, [], []

    if intent == "queue":
        top = cards[0]
        mins = queue_minutes if queue_minutes is not None else 0
        answer = (
            f"For {top.get('company_name')}, the queue estimate is about {mins} minutes "
            "from accepted chats and table capacity. Ask only if that timing still works for you."
        )
        return answer, [top], [top["brief_id"]]

    if intent == "prepare":
        top = cards[seed % len(cards)]
        reasons = top.get("reasons") or []
        tip = reasons[0]["text"] if reasons else "the published skills on the brief"
        answer = (
            f"Before {top.get('company_name')}, open their brief and prepare one story that shows "
            f"{tip}. Ask what success looks like in the first 90 days — you steer the conversation."
        )
        return answer, [top], [top["brief_id"]]

    if intent == "strongest":
        strong = [c for c in cards if c.get("bucket") == "strong"] or cards[:2]
        lines = "; ".join(_card_blurb(c) for c in strong[:3])
        answer = (
            f"Your strongest overlaps right now: {lines}. "
            "Open Why? on each card before you spend an approach."
        )
        return answer, strong[:3], [c["brief_id"] for c in strong[:3]]

    if intent == "next":
        # Rotate primary suggestion by question hash so “who next” is not always #1 wording.
        order = list(cards)
        start = seed % len(order)
        ordered = order[start:] + order[:start]
        top, second = ordered[0], ordered[1] if len(ordered) > 1 else None
        if second:
            answer = (
                f"I’d start with {top.get('company_name')} ({top.get('bucket')}) — {_card_blurb(top)}. "
                f"A solid backup is {second.get('company_name')}. You choose whom to ask."
            )
            shown = [top, second]
        else:
            answer = (
                f"A clear next step is {top.get('company_name')} ({top.get('bucket')}). "
                f"{_card_blurb(top)}. You decide whether to ask."
            )
            shown = [top]
        return answer, shown, [c["brief_id"] for c in shown]

    # General: mention a different angle / card based on the question text.
    top = cards[seed % len(cards)]
    answer = (
        f"Looking at your approved skills, {top.get('company_name')} is worth a look "
        f"({top.get('bucket')}). {_card_blurb(top)}. "
        "I never rank people or decide for you — open the brief if it feels right."
    )
    return answer, [top], [top["brief_id"]]


async def llm_copilot_answer(
    question: str,
    *,
    cards: list[dict],
    budget: dict,
    history: list[dict] | None = None,
) -> tuple[str, list[dict], list[int]] | None:
    """LLM answer grounded only in provided cards/budget. Returns None on failure."""
    prompt = (PROMPTS / "copilot.md").read_text(encoding="utf-8")
    slim_cards = [
        {
            "brief_id": c.get("brief_id"),
            "company_name": c.get("company_name"),
            "bucket": c.get("bucket"),
            "brief_summary": c.get("brief_summary"),
            "fit_summary": c.get("fit_summary"),
            "reasons": [
                {"type": r.get("type"), "text": r.get("text")}
                for r in (c.get("reasons") or [])[:3]
            ],
        }
        for c in cards[:5]
    ]
    recent = []
    for turn in (history or [])[-6:]:
        role = str(turn.get("role") or "")
        content = str(turn.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            recent.append({"role": role, "content": content[:500]})
    user = json.dumps(
        {
            "question": question,
            "history": recent,
            "budget": budget,
            "suggestions": slim_cards,
            "rules": [
                "Answer only from suggestions and budget above",
                "Never invent companies or skills",
                "Never score or decide for the person",
                "Vary wording; do not repeat a stock sentence",
                "Continue the conversation naturally using history when present",
            ],
        },
        ensure_ascii=False,
    )
    try:
        result = await chat_json(system=prompt, user=user, temperature=0.55)
    except LLMError:
        return None
    answer = str(result.get("answer") or "").strip()
    if not answer:
        return None
    ids = [int(x) for x in (result.get("brief_ids") or []) if str(x).isdigit()]
    by_id = {int(c["brief_id"]): c for c in cards if c.get("brief_id") is not None}
    shown = [by_id[i] for i in ids if i in by_id][:3]
    if not shown:
        shown = cards[:2]
        ids = [int(c["brief_id"]) for c in shown]
    return answer, shown, ids
