from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import Base, SessionLocal, engine
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


def _cors_origins() -> list[str]:
    origins = [o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()]
    app_url = (settings.app_public_url or "").strip().rstrip("/")
    if app_url and app_url not in origins:
        origins.append(app_url)
    return origins


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Always ensure schema exists (Railway fresh Postgres).
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass
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
    allow_origins=_cors_origins(),
    # Allow any Railway web preview / production domain if env is slightly wrong.
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Ensure CORS headers exist even on 500s (browser otherwise reports only CORS)."""
    origin = request.headers.get("origin")
    headers: dict[str, str] = {}
    allowed = _cors_origins()
    if origin and (
        origin.rstrip("/") in allowed
        or origin.endswith(".up.railway.app")
    ):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)[:300]},
        headers=headers,
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
