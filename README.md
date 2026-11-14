# Signal

AI helps people explain themselves. Humans decide who to talk to.

Recruitment matchmaking prototype for **City of Espoo / Junction 2026**. Full plan: [`docs/PLAN.md`](docs/PLAN.md).

## Quick start

```bash
# 1. Env
cp .env.example .env
# Optional: set LLM_API_KEY for real STT / LLM interviews

# 2. Database (uses host port 5437 to avoid local Postgres clashes)
docker compose up -d db

# 3. API
cd apps/api
python -m pip install -e ".[dev]"
python -m app.seed
uvicorn app.main:app --reload --port 8000

# 4. Web
cd apps/web
pnpm install
pnpm dev
```

- API health: http://localhost:8000/healthz  
- App: http://localhost:3000  

Without `LLM_API_KEY`, interviews use scripted fallback questions and voice transcription asks you to type instead.

## Demo path (~4 min)

1. Open `/` → pick **Jobseeker** (`seeker_demo_a`).
2. `/seeker/event` — Nordic Health Data Oy should appear as **Strong**; open **Why?**; **Ask to talk**.
3. Switch persona to **Company** → `/company/inbox` → Accept (alias + evidence only).
4. `/company/brief/new` — voice or typed hiring brief interview.
5. `/organiser/dashboard` — supply-gap; `/organiser/fairness` — Bias Mirror (expect 100%).
6. `/transparency` — what we use / never use + audit log.

## Deploy (Railway + GitHub)

See [`docs/RAILWAY.md`](docs/RAILWAY.md). Use `Dockerfile.api` + `Dockerfile.web` and a Railway Postgres plugin. Do **not** commit `.env`.

## Tests

```bash
cd apps/api
pytest -q
```

## Non-negotiables

- Matching accepts only `SeekerSkillView` / `BriefView` (no name, nationality, age, gender, school, photo).
- No automated reject/hire scores. Suggestions + reasons only.
- Audio never stored. Transcripts deleted on story approve by default.
- Synthetic data only.
