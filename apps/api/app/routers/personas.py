from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import Depends

from app.db import get_db
from app.models import Company, Seeker
from app.schemas import PersonaOut

router = APIRouter(prefix="/api/personas", tags=["personas"])


@router.get("", response_model=list[PersonaOut])
def list_personas(db: Session = Depends(get_db)) -> list[PersonaOut]:
    out: list[PersonaOut] = [
        PersonaOut(id="organiser_demo", role="organiser", label="City of Espoo events team"),
    ]
    company = db.scalar(select(Company).where(Company.demo_key == "company_demo"))
    if company:
        out.insert(
            0,
            PersonaOut(
                id="company_demo",
                role="company",
                label=f"{company.name} — Mika",
            ),
        )
    for key, label in (
        ("seeker_demo_a", "Seeker #A12 — career changer"),
        ("seeker_demo_b", "Seeker #B07 — international developer"),
    ):
        seeker = db.scalar(select(Seeker).where(Seeker.demo_key == key))
        if seeker:
            out.append(PersonaOut(id=key, role="seeker", label=label))
    return out
