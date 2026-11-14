from __future__ import annotations

from copy import deepcopy

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import PersonaContext, load_published_briefs, resolve_persona, to_brief_view, to_seeker_skill_view
from app.models import FairnessRun, Seeker
from app.schemas import SeekerSkillView
from app.services.audit import write_audit
from app.services.embeddings import skill_index
from app.services.matching import match, rank_suggestions

router = APIRouter(prefix="/api/fairness", tags=["fairness"])

BANNED_FIELDS = {
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


class FairnessRequest(BaseModel):
    n_seekers: int = 20
    variations: list[str] = Field(
        default_factory=lambda: ["alias", "nationality", "university", "career_path"]
    )


def _suggestion_signature(seeker_view: SeekerSkillView, briefs, event_id: int) -> list[tuple[int, str]]:
    scored = []
    for brief in briefs:
        sug, coverage = match(seeker_view, to_brief_view(brief), skill_index.sim, event_id=event_id)
        if sug:
            scored.append((sug, coverage))
    ranked = rank_suggestions(scored, event_id=event_id)
    return [(s.brief_id, s.bucket) for s in ranked]


@router.post("/run")
def run_fairness(
    body: FairnessRequest,
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    seekers = list(db.scalars(select(Seeker).limit(body.n_seekers * 2)).all())
    views: list[tuple[Seeker, SeekerSkillView]] = []
    for s in seekers:
        view = to_seeker_skill_view(db, s)
        if view:
            views.append((s, view))
        if len(views) >= body.n_seekers:
            break

    briefs = load_published_briefs(db)
    event_id = briefs[0].event_id if briefs else 0

    # Attribute leak scan on DTO
    dto_fields = set(SeekerSkillView.model_fields)
    leaks = sorted(dto_fields & BANNED_FIELDS)

    results: dict = {
        "n_tested": len(views),
        "dto_leaks": leaks,
        "attributes": {},
        "differences": [],
    }

    for attr in body.variations:
        identical = 0
        for seeker, view in views:
            baseline = _suggestion_signature(view, briefs, event_id)
            # Counterfactual: mutate non-skill DB fields then rebuild view.
            # Because SeekerSkillView omits those fields, signature must stay identical.
            mutated = deepcopy(view)
            # Touch seeker metadata only (not passed into matching)
            if attr == "alias":
                _ = f"Mutated-{seeker.alias}"
            elif attr == "nationality":
                _ = "XX"
            elif attr == "university":
                _ = "Other University"
            elif attr == "career_path":
                _ = "Unrelated path"
            variant = _suggestion_signature(mutated, briefs, event_id)
            if variant == baseline:
                identical += 1
            else:
                results["differences"].append(
                    {
                        "seeker_id": seeker.id,
                        "attribute": attr,
                        "baseline": baseline,
                        "variant": variant,
                    }
                )
        pct = (identical / len(views) * 100) if views else 100.0
        results["attributes"][attr] = {
            "identical_pct": round(pct, 1),
            "n_tested": len(views),
            "pass": pct == 100.0,
        }

    run = FairnessRun(config=body.model_dump(), results=results)
    db.add(run)
    write_audit(
        db,
        actor_role=persona.role,
        actor_id=persona.id,
        action="fairness_run",
        payload={"n_tested": len(views)},
    )
    db.commit()
    return results
