# Deploy Skills First! on Railway (via GitHub)

## Architecture

| Service | Source | Notes |
|---------|--------|--------|
| **Postgres** | Railway plugin | Provides `DATABASE_URL` |
| **api** | `Dockerfile.api` | FastAPI + seed data |
| **web** | `Dockerfile.web` | Next.js standalone |

## Steps

1. Push this repo to GitHub (`AlgerPire/junctionx-2026`).
2. In [Railway](https://railway.app): **New Project → Deploy from GitHub** → select the repo.
3. Add a **PostgreSQL** plugin to the project.
4. Create service **api**:
   - Settings → Build → Dockerfile path: `Dockerfile.api`
   - Root directory: `/` (repo root)
   - Attach the Postgres plugin (so `DATABASE_URL` is shared)
5. Create service **web**:
   - Dockerfile path: `Dockerfile.web`
   - Root directory: `/`
6. Generate public domains for **api** and **web** (Settings → Networking).
7. Set environment variables below on each service.
8. Redeploy. First API boot with `SEED_ON_STARTUP=1` loads demo data.

## Environment variables

### API service

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `DATABASE_URL` | Yes | From Railway Postgres (auto). App normalizes `postgres://` → `postgresql+psycopg://`. |
| `CORS_ORIGINS` | Yes | Your web URL, e.g. `https://web-xxx.up.railway.app` |
| `APP_PUBLIC_URL` | Yes | Same as web URL |
| `AUTH_SECRET` | Yes | Long random string (not `dev-only-change-me`) |
| `SEED_ON_STARTUP` | Recommended | `1` on first deploy (idempotent) |
| `AUTH_ALLOW_DEMO` | Hackathon | `1` to keep demo personas |
| `AUTH_EXPOSE_DEV_LINK` | Prod | Prefer `0` in real production |
| `LLM_PROVIDER` | For AI interviews | `azure` (recommended) or `openai` |
| `AZURE_OPENAI_API_KEY` | If azure | Your Azure OpenAI key |
| `AZURE_OPENAI_ENDPOINT` | If azure | `https://YOUR-RESOURCE.openai.azure.com/` |
| `AZURE_OPENAI_API_VERSION` | If azure | `2024-08-01-preview` |
| `AZURE_CHAT_DEPLOYMENT` | If azure | e.g. `gpt-4o` |
| `AZURE_EMBEDDING_DEPLOYMENT` | If azure | e.g. `text-embedding-3-small` |
| `LLM_API_KEY` | If openai | OpenAI key (optional if using Azure only) |
| `LLM_MODEL` | Optional | `gpt-4o` |
| `EMBED_MODEL` | Optional | `text-embedding-3-small` |
| `STT_PROVIDER` | Voice | `azure` recommended |
| `AZURE_SPEECH_KEY` | Voice | Azure Speech key |
| `AZURE_SPEECH_REGION` | Voice | e.g. `swedencentral` |
| `AZURE_TTS_VOICE` | Optional | `en-GB-SoniaNeural` |
| `DEMO_CACHE` | Optional | `0` |
| `APPROACH_BUDGET_DEFAULT` | Optional | `5` |
| `MATCH_DIRECT_THRESHOLD` | Optional | `0.85` |
| `MATCH_TRANSFERABLE_THRESHOLD` | Optional | `0.70` |
| `PRIVACY_NOTICE_VERSION` | Optional | `2026-11-14` |
| `PORT` | Auto | Railway sets this |

### Web service

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_API_URL` | Yes | **Public** API URL, e.g. `https://api-xxx.up.railway.app` (no trailing slash). Must be set as a **build** arg/variable so Next bakes it into the client. |
| `PORT` | Auto | Railway sets this |

In Railway web service → Variables, also add under **Build** variables if offered:

`NEXT_PUBLIC_API_URL=https://your-api.up.railway.app`

## Local Docker smoke test

```bash
docker compose up -d db
docker build -f Dockerfile.api -t skills-first-api .
docker run --rm -p 8000:8000 --env-file .env -e DATABASE_URL=postgresql+psycopg://signal:signal@host.docker.internal:5437/signal -e SEED_ON_STARTUP=1 skills-first-api
```

## Notes

- Never commit `.env` (real keys). Use Railway variables.
- Matching does not use the LLM to score people; LLM is for interviews / extraction / drafts.
- Without Azure/OpenAI keys the API still boots; interviews fall back to scripted prompts.
