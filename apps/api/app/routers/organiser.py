from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import PersonaContext, load_published_briefs, resolve_persona, to_seeker_skill_view
from app.models import Approach, Seeker, SkillStory
from app.schemas import SupplyGapRow
from app.services.embeddings import skill_index

router = APIRouter(prefix="/api/organiser", tags=["organiser"])


@router.get("/supply-gap", response_model=list[SupplyGapRow])
def supply_gap(
    event_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> list[SupplyGapRow]:
    _ = persona
    briefs = load_published_briefs(db)
    if event_id is not None:
        briefs = [b for b in briefs if b.event_id == event_id]

    demand: dict[int, float] = defaultdict(float)
    skill_meta: dict[int, tuple[str, str]] = {}
    for brief in briefs:
        for bs in brief.skills:
            weight = 1.0 if bs.importance == "must" else 0.3 if bs.importance == "learnable" else 0.0
            if weight:
                demand[bs.skill_id] += weight
                skill_meta[bs.skill_id] = (bs.skill.label, bs.skill.cluster)

    seekers = db.scalars(select(Seeker)).all()
    supply: dict[int, float] = defaultdict(float)
    contributors: dict[int, set[int]] = defaultdict(set)
    transfer_t = 0.70
    for seeker in seekers:
        view = to_seeker_skill_view(db, seeker)
        if view is None:
            continue
        for skill_id in demand:
            best = max((skill_index.sim(skill_id, s.skill_id) for s in view.skills), default=0.0)
            if best >= transfer_t:
                supply[skill_id] += 1.0
                contributors[skill_id].add(seeker.id)

    rows: list[SupplyGapRow] = []
    for skill_id, dem in demand.items():
        label, cluster = skill_meta[skill_id]
        sup = supply.get(skill_id, 0.0)
        suppressed = len(contributors.get(skill_id, set())) < 3 and sup > 0
        rows.append(
            SupplyGapRow(
                skill=label,
                cluster=cluster,
                demand=round(dem, 2),
                supply=0.0 if suppressed else round(sup, 2),
                gap=round(dem - (0 if suppressed else sup), 2),
                suppressed=suppressed,
            )
        )
    rows.sort(key=lambda r: r.gap, reverse=True)
    return rows


@router.get("/event-stats")
def event_stats(
    db: Session = Depends(get_db),
    persona: PersonaContext = Depends(resolve_persona),
) -> dict:
    _ = persona
    approaches = db.scalars(select(Approach)).all()
    requested = sum(1 for a in approaches if a.status == "requested")
    accepted = sum(1 for a in approaches if a.status == "accepted")
    declined = sum(1 for a in approaches if a.status == "declined")
    decided = accepted + declined
    acceptance_rate = (accepted / decided) if decided else 0.0
    approved_stories = db.scalars(select(SkillStory).where(SkillStory.status == "approved")).all()
    return {
        "approaches_total": len(approaches),
        "requested": requested,
        "accepted": accepted,
        "declined": declined,
        "acceptance_rate": round(acceptance_rate, 3),
        "approved_stories": len(approved_stories),
    }
