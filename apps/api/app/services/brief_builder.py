from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Brief, BriefSkill, Company, Event, Skill
from app.services.llm import LLMError, chat_json
from app.services.skill_mapper import map_skills_from_transcript
from app.config import get_settings


def _resolve_labels(db: Session, labels: list[str]) -> list[Skill]:
    found: list[Skill] = []
    seen: set[int] = set()
    for label in labels:
        clean = (label or "").strip()
        if not clean:
            continue
        skill = db.scalar(select(Skill).where(Skill.label.ilike(clean)))
        if skill is None:
            # fuzzy contains
            skill = db.scalar(select(Skill).where(Skill.label.ilike(f"%{clean}%")))
        if skill and skill.id not in seen:
            found.append(skill)
            seen.add(skill.id)
    return found


async def extract_brief_from_conversation(
    db: Session,
    *,
    messages: list[dict[str, str]],
    draft: dict[str, Any],
) -> dict[str, Any]:
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in messages if m.get("content"))
    settings = get_settings()

    # Prefer constrained skill mapping from transcript when possible
    mapped: list[dict[str, Any]] = []
    try:
        mapped = await map_skills_from_transcript(
            transcript,
            kind="brief",
            api_key=settings.azure_openai_api_key or settings.llm_api_key,
            embed_model=settings.embed_model,
        )
    except Exception:
        mapped = []

    # LLM structuring pass using running draft + transcript
    from pathlib import Path

    prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "extract_brief.md"
    system = prompt_path.read_text(encoding="utf-8") if prompt_path.exists() else (
        "Build a hiring brief JSON from TRANSCRIPT and DRAFT."
    )
    # Candidate skill labels from draft + mapped
    candidates = []
    for label in (
        list(draft.get("must_skills") or [])
        + list(draft.get("learnable_skills") or [])
        + list(draft.get("nice_skills") or [])
    ):
        candidates.append({"label": label})
    for m in mapped:
        candidates.append({"skill_id": m["skill_id"], "label": m["label"]})

    structured: dict[str, Any] = {}
    try:
        structured = await chat_json(
            system=system
            + "\nAlso accept skill labels if skill_id unknown. Prefer CANDIDATES.",
            user=(
                f"DRAFT={draft}\nCANDIDATES={candidates}\nTRANSCRIPT={transcript}\n"
                "Return the brief JSON. Skills may use label if id unknown."
            ),
        )
    except LLMError:
        structured = {}

    title = structured.get("title") or draft.get("title") or "Hiring brief"
    plain_summary = structured.get("plain_summary") or draft.get("plain_summary") or ""
    problem = structured.get("problem_90_days") or draft.get("problem_90_days") or ""
    work_mode = structured.get("work_mode") or draft.get("work_mode") or "hybrid"
    if work_mode not in {"on_site", "hybrid", "remote"}:
        work_mode = "hybrid"

    langs = structured.get("required_languages") or draft.get("required_languages") or []
    international_ok = structured.get("international_ok")
    if international_ok is None:
        international_ok = draft.get("international_ok")
    if international_ok is None:
        international_ok = True
    relocation = structured.get("relocation_support")
    if relocation is None:
        relocation = draft.get("relocation_support")
    if relocation is None:
        relocation = False
    onboarding = structured.get("onboarding_support") or draft.get("onboarding_support") or ""

    skills_out: list[dict[str, Any]] = []
    # From mapper first
    for m in mapped:
        skills_out.append(
            {
                "skill_id": m["skill_id"],
                "label": m["label"],
                "importance": m.get("importance") or "must",
                "source_quote": m.get("evidence_quote") or m.get("source_quote"),
            }
        )
    # From structured / draft labels
    for importance, key in (
        ("must", "must_skills"),
        ("learnable", "learnable_skills"),
        ("nice", "nice_skills"),
    ):
        labels = list(draft.get(key) or [])
        for item in structured.get("skills") or []:
            if item.get("importance") == importance:
                if item.get("label"):
                    labels.append(item["label"])
                elif item.get("skill_id"):
                    skill = db.get(Skill, int(item["skill_id"]))
                    if skill:
                        labels.append(skill.label)
        for skill in _resolve_labels(db, labels):
            if any(s["skill_id"] == skill.id for s in skills_out):
                # upgrade importance if must
                for s in skills_out:
                    if s["skill_id"] == skill.id and importance == "must":
                        s["importance"] = "must"
                continue
            skills_out.append(
                {
                    "skill_id": skill.id,
                    "label": skill.label,
                    "importance": importance,
                    "source_quote": None,
                }
            )

    return {
        "title": str(title)[:200],
        "plain_summary": str(plain_summary),
        "problem_90_days": str(problem),
        "required_languages": langs,
        "international_ok": bool(international_ok),
        "relocation_support": bool(relocation),
        "onboarding_support": str(onboarding),
        "work_mode": work_mode,
        "skills": skills_out,
        "removed_requirements": structured.get("removed_requirements") or [],
    }


async def create_brief_from_draft(
    db: Session,
    *,
    company: Company,
    payload: dict[str, Any],
    publish: bool = False,
) -> Brief:
    event = db.scalar(select(Event).order_by(Event.id.asc()))
    if event is None:
        raise ValueError("No event seeded")

    brief = Brief(
        company_id=company.id,
        event_id=event.id,
        title=payload["title"],
        plain_summary=payload.get("plain_summary") or "",
        problem_90_days=payload.get("problem_90_days") or "",
        status="published" if publish else "draft",
        required_languages=payload.get("required_languages") or [],
        international_ok=bool(payload.get("international_ok", True)),
        relocation_support=bool(payload.get("relocation_support", False)),
        onboarding_support=payload.get("onboarding_support") or "",
        work_mode=payload.get("work_mode") or "hybrid",
        tables=2,
        slot_minutes=15,
    )
    db.add(brief)
    db.flush()
    for sk in payload.get("skills") or []:
        db.add(
            BriefSkill(
                brief_id=brief.id,
                skill_id=int(sk["skill_id"]),
                importance=sk.get("importance") or "must",
                source_quote=sk.get("source_quote"),
            )
        )
    db.commit()
    db.refresh(brief)
    return brief
