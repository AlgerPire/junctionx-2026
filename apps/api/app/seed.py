"""Idempotent seed: python -m app.seed"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.models import (
    Brief,
    BriefSkill,
    Company,
    Event,
    Seeker,
    Skill,
    SkillStory,
    SkillSynonym,
    StorySkill,
)
from app.paths import find_repo_root
from app.services.embeddings import embed_texts_sync, load_skill_definitions, skill_index

ROOT = find_repo_root()
SEED = ROOT / "data" / "seed"

EXTRA_SEEKERS = [
    ("Support generalist", ["Customer support", "Ticket triage", "Written communication", "Empathy"]),
    ("Data junior", ["SQL", "Data cleaning", "Python", "Data visualisation"]),
    ("Cloud ops", ["Docker", "Linux administration", "CI/CD", "Observability"]),
    ("Logistics associate", ["Logistics coordination", "Inventory management", "Time management"]),
    ("Finance clerk", ["Bookkeeping", "Excel / Sheets advanced", "Attention to detail"]),
    ("QA hardware", ["Hardware testing", "Documentation", "Attention to detail"]),
    ("Frontend junior", ["JavaScript", "HTML and CSS", "React", "Git version control"]),
    ("Nurse informatics interest", ["Nursing practice", "Medical terminology", "Written communication"]),
    ("CS teacher", ["Teaching and facilitation", "Problem solving", "Stakeholder communication"]),
    ("Warehouse lead", ["Warehouse systems", "Shift scheduling", "Teamwork"]),
    ("Security curious", ["Network security basics", "Linux administration", "Written communication"]),
    ("API builder", ["REST APIs", "Backend development", "PostgreSQL"]),
    ("Success manager", ["Customer success", "CRM tools", "Onboarding facilitation"]),
    ("Ops planner", ["Operations planning", "KPI tracking", "Process improvement"]),
    ("Embedded hobbyist", ["Embedded C", "Electronics basics", "Problem solving"]),
    ("Analytics hobby", ["Pandas", "Statistics", "Dashboarding"]),
    ("Public web", ["Accessibility awareness", "HTML and CSS", "Documentation"]),
    ("Hospital admin", ["Hospital workflows", "Project coordination", "Empathy"]),
    ("Route planner", ["Route optimisation", "Logistics coordination", "Spreadsheet modelling"]),
    ("Identity focused", ["Identity and access management", "Cloud security", "Documentation"]),
    ("Helpdesk", ["Customer support", "Conflict de-escalation", "Knowledge base writing"]),
    ("ETL helper", ["ETL pipelines", "SQL", "Data cleaning"]),
    ("Civic backend", ["FastAPI", "REST APIs", "Git version control"]),
    ("Test automation interest", ["Test automation", "Regression testing", "Python"]),
    ("Budget tracker", ["Budget tracking", "Spreadsheet modelling", "Written communication"]),
    ("Mentor type", ["Mentoring", "Coaching", "Verbal communication"]),
    ("Privacy aware", ["Privacy awareness", "GDPR basics", "Documentation"]),
    ("Workshop host", ["Workshop facilitation", "Public speaking", "Adaptability"]),
    ("Sensor tinkerer", ["Sensor integration", "Firmware debugging", "Documentation"]),
    ("Accounts helper", ["Accounts payable", "Invoice reconciliation", "Attention to detail"]),
    ("Mobility data", ["Data analysis", "Dashboarding", "Critical thinking"]),
    ("Bilingual support", ["Customer support", "Cross-cultural collaboration", "Finnish language (work)"]),
    ("Swedish support", ["Customer support", "Swedish language (work)", "Empathy"]),
    ("No story yet A", []),
    ("No story yet B", []),
]


def _load_json(name: str) -> list | dict:
    with (SEED / name).open(encoding="utf-8") as f:
        return json.load(f)


def upsert_skills(db) -> dict[str, Skill]:
    definitions = load_skill_definitions()
    settings = get_settings()
    existing = {s.label.lower(): s for s in db.scalars(select(Skill)).all()}
    created: list[Skill] = []
    for item in definitions:
        label = str(item["label"])
        key = label.lower()
        labels = item.get("labels") or {"en": label}
        if key in existing:
            skill = existing[key]
            skill.description = str(item.get("description") or skill.description)
            skill.cluster = str(item.get("cluster") or skill.cluster)
            skill.esco_uri = item.get("esco_uri")  # type: ignore[assignment]
            skill.labels = labels  # type: ignore[assignment]
        else:
            skill = Skill(
                label=label,
                description=str(item.get("description") or ""),
                cluster=str(item.get("cluster") or "transversal"),
                esco_uri=item.get("esco_uri"),  # type: ignore[arg-type]
                labels=labels,  # type: ignore[arg-type]
            )
            db.add(skill)
            created.append(skill)
            existing[key] = skill
    db.flush()

    # Refresh synonym layer from subset definitions
    for item in definitions:
        label = str(item["label"])
        skill = existing.get(label.lower())
        if skill is None:
            continue
        for syn in item.get("synonyms") or []:
            lang = str(syn.get("lang") or "en")
            synonym = str(syn.get("synonym") or "").strip()
            if not synonym:
                continue
            found = db.scalar(
                select(SkillSynonym).where(
                    SkillSynonym.lang == lang,
                    SkillSynonym.synonym == synonym,
                )
            )
            if found is None:
                db.add(SkillSynonym(skill_id=skill.id, lang=lang, synonym=synonym))
            else:
                found.skill_id = skill.id
    db.flush()

    # Re-embed when missing, or when switching to Azure (local hash vectors are 64-d).
    use_azure = settings.llm_provider == "azure" and bool(settings.azure_openai_api_key)
    need_embed = [
        s
        for s in existing.values()
        if not s.embedding or (use_azure and len(s.embedding or []) < 100)
    ]
    if need_embed:
        # Batch to stay within provider limits
        batch_size = 32
        for i in range(0, len(need_embed), batch_size):
            batch = need_embed[i : i + batch_size]
            texts = [f"{s.label}. {s.description}" for s in batch]
            vectors = embed_texts_sync(texts, api_key=settings.llm_api_key, model=settings.embed_model)
            for skill, vec in zip(batch, vectors, strict=True):
                skill.embedding = vec
            db.commit()
    db.commit()
    return {s.label: s for s in existing.values()}


def _ensure_columns() -> None:
    """Lightweight additive migrations for local/pilot DBs (no Alembic yet)."""
    from sqlalchemy import text

    statements = [
        "ALTER TABLE skills ADD COLUMN IF NOT EXISTS labels JSON DEFAULT '{}'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE",
    ]
    with engine.begin() as conn:
        for sql in statements:
            try:
                conn.execute(text(sql))
            except Exception:
                pass


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_columns()
    db = SessionLocal()
    try:
        by_label = upsert_skills(db)

        event = db.scalar(select(Event).where(Event.name == "Espoo Talent Meet 2026"))
        if event is None:
            event = Event(
                name="Espoo Talent Meet 2026",
                date=date(2026, 11, 15),
                mode="hybrid",
                status="upcoming",
            )
            db.add(event)
            db.flush()

        companies_raw = _load_json("companies.json")
        companies_by_name: dict[str, Company] = {
            c.name: c for c in db.scalars(select(Company)).all()
        }
        for row in companies_raw:
            existing = None
            if row.get("demo_key"):
                existing = db.scalar(select(Company).where(Company.demo_key == row["demo_key"]))
            if existing is None:
                existing = companies_by_name.get(row["name"])
            if existing is None:
                existing = Company(
                    name=row["name"],
                    sector=row["sector"],
                    size_band=row["size_band"],
                    description=row["description"],
                    demo_key=row.get("demo_key"),
                )
                db.add(existing)
                db.flush()
            else:
                existing.sector = row["sector"]
                existing.size_band = row["size_band"]
                existing.description = row["description"]
                existing.demo_key = row.get("demo_key")
            companies_by_name[existing.name] = existing
        db.commit()

        briefs_raw = _load_json("briefs.json")
        for row in briefs_raw:
            if row.get("company_demo_key"):
                company = db.scalar(select(Company).where(Company.demo_key == row["company_demo_key"]))
            else:
                company = companies_by_name.get(row["company_name"])
            if company is None:
                continue
            brief = db.scalar(
                select(Brief).where(Brief.company_id == company.id, Brief.title == row["title"])
            )
            if brief is None:
                brief = Brief(company_id=company.id, event_id=event.id, title=row["title"])
                db.add(brief)
                db.flush()
            brief.plain_summary = row["plain_summary"]
            brief.problem_90_days = row["problem_90_days"]
            brief.status = "published"
            brief.required_languages = row["required_languages"]
            brief.international_ok = row["international_ok"]
            brief.relocation_support = row["relocation_support"]
            brief.onboarding_support = row["onboarding_support"]
            brief.work_mode = row["work_mode"]
            brief.tables = 2
            brief.slot_minutes = 15
            brief.skills.clear()
            db.flush()
            for importance, key in (("must", "must"), ("learnable", "learnable"), ("nice", "nice")):
                for label in row.get(key, []):
                    skill = by_label.get(label)
                    if skill is None:
                        continue
                    brief.skills.append(
                        BriefSkill(skill_id=skill.id, importance=importance, source_quote=None)
                    )
        db.commit()

        seekers_raw = list(_load_json("seekers.json"))
        # Expand to ~40 with generated synthetic profiles
        for i, (path_label, skill_labels) in enumerate(EXTRA_SEEKERS, start=1):
            alias = f"Seeker #G{i:02d}"
            seekers_raw.append(
                {
                    "demo_key": None,
                    "alias": alias,
                    "display_name": f"Synthetic Person {i}",
                    "languages": [{"lang": "en", "level": "B2"}],
                    "needs_relocation": i % 4 == 0,
                    "career_path_label": path_label,
                    "synthetic_nationality": ["FI", "SE", "IN", "NG", "BR"][i % 5],
                    "synthetic_university": ["Aalto", "LUT", "Tampere U", "Online", "Other"][i % 5],
                    "approved": bool(skill_labels),
                    "hidden_gem": False,
                    "skills": [
                        {
                            "label": label,
                            "evidence_quote": f"I used {label.lower()} in a real project for {path_label}.",
                        }
                        for label in skill_labels
                    ],
                }
            )

        settings = get_settings()
        for row in seekers_raw:
            seeker = None
            if row.get("demo_key"):
                seeker = db.scalar(select(Seeker).where(Seeker.demo_key == row["demo_key"]))
            if seeker is None:
                seeker = db.scalar(select(Seeker).where(Seeker.alias == row["alias"]))
            is_new = seeker is None
            if seeker is None:
                seeker = Seeker(
                    alias=row["alias"],
                    display_name=row["display_name"],
                    approach_budget_total=settings.approach_budget_default,
                    approach_budget_remaining=settings.approach_budget_default,
                )
                db.add(seeker)
                db.flush()
            seeker.display_name = row["display_name"]
            seeker.languages = row["languages"]
            seeker.needs_relocation = row["needs_relocation"]
            seeker.approach_budget_total = settings.approach_budget_default
            if is_new:
                seeker.approach_budget_remaining = settings.approach_budget_default
            seeker.demo_key = row.get("demo_key")
            seeker.career_path_label = row.get("career_path_label")
            seeker.synthetic_nationality = row.get("synthetic_nationality")
            seeker.synthetic_university = row.get("synthetic_university")

            story = db.scalar(select(SkillStory).where(SkillStory.seeker_id == seeker.id))
            if not row.get("approved"):
                if story is None:
                    story = SkillStory(seeker_id=seeker.id, status="draft")
                    db.add(story)
                else:
                    story.status = "draft"
                    story.skills.clear()
                continue

            if story is None:
                story = SkillStory(seeker_id=seeker.id, status="approved")
                db.add(story)
                db.flush()
            story.status = "approved"
            story.transcript_text = None
            story.skills.clear()
            db.flush()
            for skill_row in row.get("skills", []):
                skill = by_label.get(skill_row["label"])
                if skill is None:
                    continue
                story.skills.append(
                    StorySkill(
                        skill_id=skill.id,
                        evidence_quote=skill_row["evidence_quote"],
                        seeker_confirmed=True,
                    )
                )
        db.commit()

        skill_index.load_from_db(db)
        print(
            f"Seed complete: skills={db.query(Skill).count()}, "
            f"companies={db.query(Company).count()}, "
            f"briefs={db.query(Brief).count()}, "
            f"seekers={db.query(Seeker).count()}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
