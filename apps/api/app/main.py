from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import SessionLocal
from app.routers import (
    approaches,
    audit,
    auth,
    briefs,
    consent,
    copilot,
    fairness,
    followups,
    interviews,
    organiser,
    personas,
    stories,
    suggestions,
    voice,
)
from app.services.embeddings import skill_index

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.seed_on_startup:
        try:
            from app.seed import seed

            seed()
        except Exception:
            pass
    db = SessionLocal()
    try:
        skill_index.load_from_db(db)
    except Exception:
        pass
    finally:
        db.close()
    yield


app = FastAPI(title="First: Skill! API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personas.router)
app.include_router(auth.router)
app.include_router(consent.router)
app.include_router(suggestions.router)
app.include_router(approaches.router)
app.include_router(briefs.router)
app.include_router(stories.router)
app.include_router(organiser.router)
app.include_router(fairness.router)
app.include_router(audit.router)
app.include_router(interviews.router)
app.include_router(voice.router)
app.include_router(copilot.router)
app.include_router(followups.router)


@app.get("/healthz")
def healthz() -> dict[str, bool]:
    return {"ok": True, "embeddings_ready": skill_index.ready}
