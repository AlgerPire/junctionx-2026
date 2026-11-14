from __future__ import annotations

import hashlib
from collections.abc import Callable
from typing import Literal

from app.config import get_settings
from app.schemas import BriefView, Reason, SeekerSkillView, Suggestion
from app.services.match_explain import attach_overview

SimFn = Callable[[int, int], float]
Bucket = Literal["strong", "good", "explore"]


def _tiebreak(event_id: int, seeker_id: int, brief_id: int) -> int:
    digest = hashlib.sha256(f"{event_id}:{seeker_id}:{brief_id}".encode()).hexdigest()
    return int(digest[:8], 16)


def match(
    seeker: SeekerSkillView,
    brief: BriefView,
    sim: SimFn,
    *,
    event_id: int = 0,
    direct_threshold: float | None = None,
    transferable_threshold: float | None = None,
) -> tuple[Suggestion | None, float]:
    """Pure deterministic matcher. Returns (suggestion_or_none, coverage)."""
    settings = get_settings()
    direct_t = direct_threshold if direct_threshold is not None else settings.match_direct_threshold
    transfer_t = (
        transferable_threshold
        if transferable_threshold is not None
        else settings.match_transferable_threshold
    )

    reasons: list[Reason] = []
    direct = 0
    transferable = 0

    for m in brief.must:
        best_skill = None
        best_sim = 0.0
        for s in seeker.skills:
            score = sim(m.skill_id, s.skill_id)
            if score > best_sim:
                best_sim = score
                best_skill = s
        if best_skill is None:
            reasons.append(
                Reason(
                    type="consideration",
                    brief_skill=m.label,
                    text=f"No evidenced skill close to must-have {m.label}",
                )
            )
            continue
        if best_sim >= direct_t:
            direct += 1
            reasons.append(
                Reason(
                    type="direct",
                    brief_skill=m.label,
                    seeker_skill=best_skill.label,
                    evidence_quote=seeker.evidence.get(best_skill.skill_id),
                    text=f"Evidence of {m.label} in their own words",
                )
            )
        elif best_sim >= transfer_t:
            transferable += 1
            reasons.append(
                Reason(
                    type="transferable",
                    brief_skill=m.label,
                    seeker_skill=best_skill.label,
                    evidence_quote=seeker.evidence.get(best_skill.skill_id),
                    text=(
                        f"{best_skill.label} is a related skill that can carry over to {m.label}"
                    ),
                )
            )
        else:
            reasons.append(
                Reason(
                    type="consideration",
                    brief_skill=m.label,
                    seeker_skill=best_skill.label,
                    text=(
                        f"Must-have {m.label} is not closely covered "
                        f"(closest evidenced skill: {best_skill.label})"
                    ),
                )
            )

    n_must = max(len(brief.must), 1)
    coverage = (direct + 0.5 * transferable) / n_must

    for learnable in brief.learnable:
        has = any(sim(learnable.skill_id, s.skill_id) >= transfer_t for s in seeker.skills)
        if not has:
            reasons.append(
                Reason(
                    type="learnable_gap",
                    brief_skill=learnable.label,
                    text=f"{learnable.label} can be learned on the job according to the company",
                )
            )

    seeker_langs = {lang.lang.lower() for lang in seeker.languages}
    for req in brief.required_languages:
        if req.lang.lower() not in seeker_langs:
            reasons.append(
                Reason(
                    type="consideration",
                    text=f"The company states {req.lang} ({req.level}) is required",
                )
            )

    if seeker.needs_relocation and not brief.relocation_support:
        reasons.append(
            Reason(
                type="consideration",
                text="Relocation support is not offered for this role",
            )
        )

    bucket: Bucket | None
    if coverage >= 0.75:
        bucket = "strong"
    elif coverage >= 0.5:
        bucket = "good"
    elif coverage >= 0.3:
        bucket = "explore"
    else:
        bucket = None

    if bucket is None:
        return None, coverage

    suggestion = Suggestion(
        brief_id=brief.brief_id,
        seeker_id=seeker.seeker_id,
        bucket=bucket,
        reasons=reasons,
        data_used=["Approved skill story", "Stated languages"],
    )
    attach_overview(suggestion, coverage)
    # event_id reserved for ordering helpers
    _ = event_id
    return suggestion, coverage


def rank_suggestions(
    items: list[tuple[Suggestion, float]],
    *,
    event_id: int,
) -> list[Suggestion]:
    bucket_order = {"strong": 0, "good": 1, "explore": 2}

    def key(pair: tuple[Suggestion, float]) -> tuple[int, float, int]:
        sug, coverage = pair
        return (
            bucket_order[sug.bucket],
            -coverage,
            _tiebreak(event_id, sug.seeker_id, sug.brief_id),
        )

    return [s for s, _ in sorted(items, key=key)]
