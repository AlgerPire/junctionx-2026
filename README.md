# Skills First!

**AI helps people explain themselves. Humans decide who to talk to.**

Recruitment and matchmaking prototype for the **City of Espoo** challenge at **Junction 2026**.

Internal code/CSS still uses the `signal-*` namespace; the product name is **Skills First!**

---

## Why this exists

Espoo already runs strong recruitment events (online, on-site, hybrid). The hard part is not logistics — it is **signal vs noise**:

- Companies send vague needs late, so the wrong people end up in the room.
- Talent struggle to say what they can actually do; CVs and AI-polished applications hide transferable skills.
- Organisers get volume without a clear view of real capabilities (especially in tech).
- Recruiters drown in irrelevant approaches on event day.
- Both sides increasingly talk through **AI-written materials screened by AI**, so matches risk being synthetic-on-synthetic.

**Skills First!** is built so companies and talent can describe **real skills and real needs early**, with evidence, then meet in a small number of relevant conversations — without machines scoring, ranking, or rejecting people.

---

## What we built

A before / during / after tool for Espoo-style matchmaking events, with three workspaces:

| Role | What they do |
|------|----------------|
| **Company** | Turn a vague hire into a skills-based job brief; review approaches; invite candidates |
| **Jobseeker** | Tell a skill story with evidence quotes; get suggested conversations; spend a limited approach budget |
| **Organiser** | See aggregated supply vs demand; run Bias Mirror; stay out of individual profiling |

### Core product

1. **Voice Hiring Brief (company)**  
   A short voice or text interview turns “we need someone” into a structured brief: must-have vs learnable skills, languages, relocation/onboarding. A human edits and publishes. Needs arrive **clear and early**.

2. **Voice Skill Story (jobseeker)**  
   A short interview about real situations. Every skill is tied to a **verbatim quote** from the person’s own words. Nothing is shared until they approve. Alias first — name only after both sides agree to talk.

3. **Suggested conversations**  
   Deterministic matching on skills only proposes a few conversations with a plain-language **“Why?”**. No numeric hire scores, no auto-reject, nobody hidden (browse-all still exists).

4. **Approach budget & queue**  
   Caps irrelevant pings. Companies set capacity; waiting time is visible.

5. **Hiring assistant (company desk)**  
   Speak or type to open a job, candidates, invite, or inbox. On phones it opens as a **page**, not a cramped modal.

6. **Organiser tools**  
   **Supply-gap radar** (anonymous aggregates) and **Bias Mirror** (suggestions must not change when non-skill attributes change).

7. **Transparency & audit**  
   What AI may do vs what people decide; what matching uses / never uses; a visible audit log of actions (not conversation content).

### Design choices (and why)

| Choice | Why |
|--------|-----|
| AI extracts / explains / drafts only — never scores people | Challenge + EU AI Act posture: decision support with human oversight |
| Matching sees only `SeekerSkillView` / `BriefView` | Structurally blocks bias from name, nationality, age, gender, school, photo, address |
| Skills from a fixed candidate list; quotes must be exact transcript substrings | Stops AI inventing skills or paraphrasing “evidence” |
| Audio never stored; transcripts minimised | Privacy by design for public-sector events |
| Voice always optional + captions | Accessibility; every voice step has a text fallback |
| Synthetic demo data only | Safe hackathon prototype; no real personal data in the repo |

---

## Stack

| Layer | Choice |
|-------|--------|
| Web | Next.js 14, TypeScript, Tailwind |
| API | FastAPI, Pydantic v2, SQLAlchemy 2 |
| DB | PostgreSQL 16 |
| Skills | ESCO-oriented skill set + embeddings for matching |
| Voice | Browser mic → STT (Azure Speech / Whisper); TTS in browser or Azure |

---

## Quick start

```bash
# 1. Env
cp .env.example .env
# Optional: LLM / Azure Speech keys for live interviews and STT

# 2. Database (host port 5437 to avoid local Postgres clashes)
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

Without LLM / STT keys, interviews fall back to scripted prompts and typing instead of speech.

---

## Demo path (~4 min)

1. Open `/` → pick **Jobseeker** (`seeker_demo_a`).
2. `/seeker/event` — find a **Strong** match; open **Why?**; **Ask to talk**.
3. Switch persona to **Company** → `/company/inbox` → Accept (alias + evidence only).
4. `/company/brief/new` or the hiring **Assistant** — voice or typed hiring brief.
5. `/organiser/dashboard` — supply gap; `/organiser/fairness` — Bias Mirror (expect 100%).
6. `/transparency` — what we use / never use + audit log.

---

## Deploy (Railway + GitHub)

See [`docs/RAILWAY.md`](docs/RAILWAY.md).

- Service **api** → `Dockerfile.api` (healthcheck `/healthz`)
- Service **web** → `Dockerfile.web` (set `NEXT_PUBLIC_API_URL` to the public API URL)
- Postgres plugin → `DATABASE_URL` on the API  

Do **not** commit `.env`. Root `railway.toml` must not force a single Dockerfile for every service.

---

## Tests

```bash
cd apps/api
pytest -q
```

---

## Non-negotiables

- Matching accepts only skills/needs views — never name, nationality, age, gender, school, photo, or address.
- No automated reject/hire scores. Suggestions + reasons only; humans decide.
- Audio is never stored. Transcripts are not logged as product analytics.
- Synthetic data only in this prototype.

---

## Challenge alignment

Built for Espoo’s **Rethinking Recruitment** challenge: stronger signal, less noise, fairness and privacy, no automated decisions about individuals. Full implementation notes: [`docs/PLAN.md`](docs/PLAN.md).
