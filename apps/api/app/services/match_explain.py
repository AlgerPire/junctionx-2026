"""Plain-language fit / gap overview from deterministic match reasons.

Does not score or reject people — only explains what the matcher already found.
"""

from __future__ import annotations

from app.schemas import Reason, Suggestion


def build_overview(
    *,
    bucket: str,
    reasons: list[Reason],
    coverage: float,
    perspective: str = "seeker",
) -> tuple[str, str | None, str]:
    """Return (fit_summary, gaps_summary_or_none, overview)."""
    direct = [r for r in reasons if r.type == "direct"]
    transferable = [r for r in reasons if r.type == "transferable"]
    learnable = [r for r in reasons if r.type == "learnable_gap"]
    considerations = [r for r in reasons if r.type == "consideration"]

    role_word = "this role" if perspective == "seeker" else "your brief"

    fit_bits: list[str] = []
    if direct:
        skills = ", ".join(sorted({r.brief_skill or r.seeker_skill or "a must-have skill" for r in direct}))
        if perspective == "company":
            fit_bits.append(f"their approved story shows clear evidence for {skills}")
        else:
            fit_bits.append(f"your approved story shows clear evidence for {skills}")
    if transferable:
        pairs = []
        for r in transferable[:3]:
            if r.seeker_skill and r.brief_skill:
                pairs.append(f"{r.seeker_skill} → {r.brief_skill}")
        if pairs:
            fit_bits.append(
                "related skills that can carry over (" + "; ".join(pairs) + ")"
            )
    if learnable:
        labels = ", ".join(sorted({r.brief_skill for r in learnable if r.brief_skill}))
        if labels:
            fit_bits.append(
                f"the company treats {labels} as learnable on the job"
            )

    bucket_line = {
        "strong": f"Overall this looks like a strong fit for {role_word}",
        "good": f"Overall this looks like a good conversation to consider for {role_word}",
        "explore": f"Overall this is worth exploring for {role_word}, with some open questions",
    }.get(bucket, f"Overall this is a possible match for {role_word}")

    if fit_bits:
        fit_summary = bucket_line + " because " + "; ".join(fit_bits) + "."
    else:
        fit_summary = bucket_line + "."

    gap_bits: list[str] = []
    for r in considerations:
        gap_bits.append(r.text.rstrip("."))
    # Learnable gaps are positive framing but still "not yet evidenced"
    for r in learnable:
        if r.brief_skill:
            gap_bits.append(f"{r.brief_skill} is not evidenced yet (company says it can be learned)")

    gaps_summary: str | None = None
    if gap_bits:
        # de-dupe while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for g in gap_bits:
            key = g.lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(g)
        gaps_summary = "Things to weigh: " + "; ".join(unique) + ". These are considerations for humans — not automatic rejection."

    coverage_note = f" About {int(round(coverage * 100))}% of must-have skills are covered by direct or related evidence."
    overview = fit_summary + coverage_note
    if gaps_summary:
        overview = overview + " " + gaps_summary
    overview += " AI assists with the explanation; you decide whether to talk."

    return fit_summary, gaps_summary, overview


def attach_overview(suggestion: Suggestion, coverage: float, *, perspective: str = "seeker") -> Suggestion:
    fit, gaps, overview = build_overview(
        bucket=suggestion.bucket,
        reasons=suggestion.reasons,
        coverage=coverage,
        perspective=perspective,
    )
    suggestion.fit_summary = fit
    suggestion.gaps_summary = gaps
    suggestion.overview = overview
    # Coverage is already (direct + 0.5 * transferable) / n_must — surface it for the UI.
    pct = int(round(max(0.0, min(1.0, coverage)) * 100))
    suggestion.skill_overlap_pct = pct
    must_reasons = [
        r
        for r in suggestion.reasons
        if r.type in {"direct", "transferable", "consideration"} and r.brief_skill
    ]
    # Deduplicate by brief_skill so each must-have is counted once.
    seen: set[str] = set()
    covered = 0
    total = 0
    for r in must_reasons:
        key = (r.brief_skill or "").lower()
        if not key or key in seen:
            continue
        seen.add(key)
        total += 1
        if r.type in {"direct", "transferable"}:
            covered += 1
    suggestion.must_have_total = total or None
    suggestion.must_have_covered = covered if total else None
    return suggestion
