"""Rule-based company desk: route what HR said to the right page.

Never scores or ranks people — only uses already-ranked candidate lists
and existing brief metadata the company already owns.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote


@dataclass(frozen=True)
class DeskReply:
    answer: str
    action: str
    href: str | None = None
    label: str | None = None
    brief_id: int | None = None
    seeker_id: int | None = None


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9#]+", _norm(text)) if len(w) > 2}


def _brief_match(query: str, briefs: list[dict[str, Any]]) -> dict[str, Any] | None:
    q = _norm(query)
    q_words = _words(query)
    best: dict[str, Any] | None = None
    best_score = 0
    for brief in briefs:
        title = _norm(str(brief.get("title") or ""))
        summary = _norm(str(brief.get("plain_summary") or ""))
        hay = f"{title} {summary}"
        score = 0
        if title and title in q:
            score += 5
        for w in q_words:
            if w in hay:
                score += 1
        if score > best_score:
            best_score = score
            best = brief
    return best if best_score >= 2 else None


def _alias_in_text(text: str, alias: str) -> bool:
    a = _norm(alias)
    if not a:
        return False
    q = _norm(text)
    if a in q:
        return True
    # "seeker g01" / "g01" against "Seeker #G01"
    compact = re.sub(r"[^a-z0-9]", "", a)
    q_compact = re.sub(r"[^a-z0-9]", "", q)
    return len(compact) >= 3 and compact in q_compact


def _find_candidate(
    text: str,
    candidates: list[dict[str, Any]],
    *,
    prefer_strong: bool = False,
) -> dict[str, Any] | None:
    for c in candidates:
        alias = str(c.get("seeker_alias") or "")
        if alias and _alias_in_text(text, alias):
            return c
    if prefer_strong or any(w in _norm(text) for w in ("strong", "top", "best", "first")):
        for c in candidates:
            if c.get("bucket") == "strong":
                return c
        return candidates[0] if candidates else None
    return None


def reply_to_company_ask(
    text: str,
    *,
    briefs: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    inbox_open: int,
) -> DeskReply:
    """Map free-text HR request to a spoken answer and optional navigation."""
    q = _norm(text)
    published = [b for b in briefs if b.get("status") == "published"]
    drafts = [b for b in briefs if b.get("status") == "draft"]

    wants_invite = any(
        w in q
        for w in ("invite", "invitation", "send invite", "ask them to talk", "schedule")
    )
    wants_profile = any(
        w in q
        for w in (
            "profile",
            "candidate",
            "who is",
            "tell me about",
            "show me",
            "open",
            "review",
            "evidence",
            "story",
        )
    )
    wants_candidates = any(
        w in q
        for w in ("candidates", "matches", "who fits", "suggestions", "talent", "people for")
    )
    wants_inbox = any(
        w in q for w in ("inbox", "request", "approach", "who asked", "pending request")
    )
    wants_new = any(
        w in q
        for w in (
            "new brief",
            "new role",
            "new job",
            "hire for",
            "hiring for",
            "create a brief",
            "draft a",
            "write a brief",
            "list a job",
            "post a job",
            "we need",
            "looking for",
            "recruit",
        )
    )
    wants_briefs = any(
        w in q for w in ("my briefs", "list briefs", "all briefs", "published briefs")
    )

    matched_candidate = _find_candidate(
        text, candidates, prefer_strong=wants_invite or "strong" in q
    )
    matched_brief = _brief_match(text, briefs)

    if wants_invite:
        if matched_candidate:
            bid = int(matched_candidate["brief_id"])
            sid = int(matched_candidate["seeker_id"])
            alias = matched_candidate.get("seeker_alias") or "this candidate"
            title = matched_candidate.get("brief_title") or "your brief"
            return DeskReply(
                answer=(
                    f"Opening the invite for {alias} on {title}. "
                    "You still choose the message and send it yourself."
                ),
                action="invite",
                href=f"/company/briefs/{bid}?invite={sid}",
                label=f"Invite {alias}",
                brief_id=bid,
                seeker_id=sid,
            )
        if matched_brief or published:
            brief = matched_brief or published[0]
            return DeskReply(
                answer=(
                    f"Opening candidates for {brief['title']} so you can pick who to invite. "
                    "Say a candidate alias if you already know who."
                ),
                action="brief",
                href=f"/company/briefs/{brief['id']}",
                label="Review candidates",
                brief_id=int(brief["id"]),
            )
        return DeskReply(
            answer=(
                "You do not have a published brief yet. "
                "Let's draft one first, then you can invite."
            ),
            action="new_brief",
            href="/company/brief/new",
            label="Start a hiring brief",
        )

    if matched_candidate and (wants_profile or wants_candidates or "alias" in q):
        bid = int(matched_candidate["brief_id"])
        sid = int(matched_candidate["seeker_id"])
        alias = matched_candidate.get("seeker_alias") or "this candidate"
        title = matched_candidate.get("brief_title") or "the brief"
        return DeskReply(
            answer=(
                f"Opening {alias}'s evidence on {title}. "
                "Names stay hidden until they accept."
            ),
            action="candidate",
            href=f"/company/briefs/{bid}?seeker={sid}",
            label=f"Open {alias}",
            brief_id=bid,
            seeker_id=sid,
        )

    if wants_candidates or (wants_profile and matched_brief):
        brief = matched_brief or (published[0] if published else None)
        if brief is None:
            return DeskReply(
                answer="Publish a hiring brief first — then I can open its suggested candidates.",
                action="briefs",
                href="/company/briefs",
                label="My briefs",
            )
        return DeskReply(
            answer=(
                f"Opening suggested candidates for {brief['title']}. "
                "AI suggests; you decide who to invite."
            ),
            action="brief",
            href=f"/company/briefs/{brief['id']}",
            label="Open candidates",
            brief_id=int(brief["id"]),
        )

    if wants_inbox:
        if inbox_open:
            plural = "s" if inbox_open != 1 else ""
            return DeskReply(
                answer=f"You have {inbox_open} open request{plural}. Opening your inbox.",
                action="inbox",
                href="/company/inbox",
                label="Open inbox",
            )
        return DeskReply(
            answer="No open requests right now. Opening the inbox anyway so you can check.",
            action="inbox",
            href="/company/inbox",
            label="Open inbox",
        )

    if wants_briefs:
        return DeskReply(
            answer=(
                f"You have {len(published)} published and {len(drafts)} draft "
                "brief(s). Opening My briefs."
            ),
            action="briefs",
            href="/company/briefs",
            label="My briefs",
        )

    if matched_brief and any(w in q for w in ("brief", "role", "job", "listing", "open")):
        return DeskReply(
            answer=f"Opening {matched_brief['title']}.",
            action="brief",
            href=f"/company/briefs/{matched_brief['id']}",
            label="Open brief",
            brief_id=int(matched_brief["id"]),
        )

    if wants_new:
        # Carry the spoken need into the brief interview as the first answer.
        first = text.strip()
        href = "/company/brief/new"
        if first:
            href = f"/company/brief/new?first={quote(first)}"
        return DeskReply(
            answer=(
                "I'll open a new hiring brief so we can draft that role together. "
                "You stay in control of what gets listed."
            ),
            action="new_brief",
            href=href,
            label="Start hiring brief",
        )

    # Fallback: short orientation, no auto-nav forced by vague text
    parts = [
        "I can open a new hiring brief, your candidate lists, an invite dialog, or the inbox.",
    ]
    if published:
        parts.append(f"Your latest published brief is {published[0]['title']}.")
    if inbox_open:
        parts.append(f"You have {inbox_open} open request(s).")
    parts.append("What should I open?")
    return DeskReply(answer=" ".join(parts), action="none")
