# Signal: Implementation Plan (for Cursor)

> Challenge: Rethinking Recruitment (City of Espoo, Junction 2026)
> One-liner: **AI shouldn't judge people. It should help them explain themselves, so the right companies and talent actually meet.**

---

## 0. How to use this file with Cursor

1. Create the repo, then put this file at `docs/PLAN.md`.
2. Copy section 12 into `.cursor/rules/signal.mdc` (project rules).
3. Work phase by phase (section 11). Each phase has a ready-to-paste prompt. In Cursor, attach `@docs/PLAN.md` and tell it which phase to build.
4. Commit after every phase. Do not let Cursor start the next phase before the current one runs.
5. Keep a working demo at all times. The "MVP cut line" in section 11 says where you can safely stop.

---

## 1. Product summary

Signal is a before / during / after event tool for recruitment and matchmaking events organised by the City of Espoo.

**Users**
- **Company representative**: describes hiring needs, receives conversation requests.
- **Jobseeker**: explains their skills with evidence, finds relevant conversations.
- **Organiser (City of Espoo)**: sees supply/demand gaps, fairness report, event activity.

**Core features**
1. **Voice Hiring Brief** (company): a 3-5 minute spoken conversation with an AI interviewer turns a vague need into a structured, skills-based brief (must-have vs. learnable, languages, relocation/onboarding support). The brief builds live on screen. A human edits and publishes it.
2. **Voice Skill Story** (jobseeker): a short spoken interview about real situations produces a skill profile where **every skill is tied to a quote from the person's own words**. The jobseeker reviews, edits and approves before anything is shared.
3. **Suggested Conversations**: transparent matching that proposes 5-8 conversations per attendee with a plain-language "why". No numeric scores shown to people, no automated rejection, nobody hidden (everyone can browse everything).
4. **Approach budget and queue**: limits irrelevant approaches (each jobseeker has a fixed number per event; companies set capacity) and shows estimated waiting time.
5. **Event Copilot** (voice or text, private to the attendee): "Who should I talk to next?", a 20-second briefing before each conversation, a 15-second voice note after it that becomes a structured follow-up.
6. **Organiser dashboard**: Supply-gap Radar (skills demanded vs. supplied, aggregated and anonymous) and **Bias Mirror** (proves suggestions do not change when non-skill attributes change).

---

## 2. Non-negotiable rules (design and legal guardrails)

These come straight from the challenge text. Violating them costs points.

- **No automated decisions about individuals.** The system suggests and explains. Humans choose whom to contact and whom to accept. No auto-reject, no hidden candidates, no hiring score.
- **No profiling beyond skills.** Matching code must never receive: name, nationality, age, gender, photo, school/university, employer history, address. The matching function takes only the `SeekerSkillView` and `BriefView` DTOs (section 6), which do not contain those fields. Enforce this structurally, not by convention.
- **Voice = transcription only.** No tone, accent, emotion or fluency analysis (emotion recognition in workplace/recruitment contexts is restricted under the EU AI Act). Audio is never stored: transcribe in memory, discard.
- **Candidate-approved only.** Nothing from a Skill Story is visible to a company until the jobseeker approves it. Jobseeker identity stays as an alias until they request a conversation and the company accepts.
- **Evidence over claims.** Every extracted skill carries a verbatim quote from the transcript.
- **Synthetic data only.** All names, companies and profiles are fake.
- **Transparency.** Every suggestion has a "Why this suggestion?" panel listing what data was used. All actions are written to an audit log that is visible in the UI.
- **Accessibility.** Voice is always optional: every voice feature has a text input equivalent and live captions.

> Note for the pitch: recruitment is a high-risk area under the EU AI Act. Signal is designed as decision support with human oversight, transparency and data minimisation. This is a design intention for the prototype, not a legal compliance claim.

---

## 3. Scope

**MVP (must work in the demo)**
- Persona switcher (no real auth) with seeded company, jobseeker and organiser personas
- Voice Hiring Brief with live brief card, edit and publish
- Voice Skill Story with evidence quotes, edit and approve
- Matching engine with reasons, "Why this suggestion?" panel
- Suggested Conversations for jobseekers; suggested candidates (alias + approved story) for companies
- Approach request, accept/decline, approach budget meter
- Bias Mirror page
- Audit log page

**Should have**
- Supply-gap Radar
- Event Copilot (voice ask, briefing before conversation)
- Post-conversation voice note then follow-up digest
- Queue with estimated wait time
- International Readiness card on each brief (language, permit route, relocation and onboarding support)

**Stretch**
- Finnish and Swedish UI labels
- Contrast demo: naive LLM-on-CV matcher changes with a name swap, Signal does not
- Load test result (k6) and static pre-registration page for event day
- Realtime voice API instead of turn-based

---

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui | Fast to build, mobile-first, good components |
| Server state | TanStack Query | Simple caching and mutation handling |
| Charts | Recharts | Heatmap/bar for supply-gap and fairness |
| Voice in browser | `MediaRecorder` (audio/webm; audio/mp4 on Safari) + Web Speech API fallback | Works without extra SDKs |
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2 | Fastest path for LLM and embedding work |
| Database | PostgreSQL 16 (docker-compose) | Reliable; embeddings kept as float arrays and compared in Python (small skill set) |
| Embeddings | Provider embedding model, cached in DB, loaded into numpy at startup | ESCO subset is only a few hundred skills |
| LLM | Provider-agnostic adapter (`llm.py`), JSON/structured output mode | Swap provider via env var |
| Speech-to-text | Provider STT API (Whisper-class model) | Test Finnish early |
| Text-to-speech | Browser `speechSynthesis` by default; provider TTS as optional upgrade | Zero latency and free by default |
| Skills taxonomy | ESCO skills (CSV download from the ESCO portal), filtered subset | Shared skill language for both sides |
| Tests | pytest, Playwright (one smoke test), k6 (stretch) | |
| Tooling | pnpm, uv or pip, Docker Compose, Ruff, ESLint | |

> Model names change often. Put them in `.env` (`LLM_MODEL`, `EMBED_MODEL`, `STT_MODEL`, `TTS_MODEL`) and check them against the provider docs before the event.

---

## 5. Repo structure

```
signal/
├─ docs/PLAN.md
├─ docker-compose.yml
├─ .env.example
├─ .cursor/rules/signal.mdc
├─ data/
│  ├─ esco_skills_subset.csv        # filtered ESCO export (or fallback json)
│  ├─ esco_skills_fallback.json     # ~120 hand-written skills if CSV unavailable
│  └─ seed/
│     ├─ companies.json
│     ├─ briefs.json
│     ├─ seekers.json
│     └─ demo_scripts.json          # cached demo interview turns (section 8.8)
├─ apps/
│  ├─ api/
│  │  ├─ pyproject.toml
│  │  └─ app/
│  │     ├─ main.py
│  │     ├─ config.py
│  │     ├─ db.py
│  │     ├─ models.py               # SQLAlchemy models
│  │     ├─ schemas.py              # Pydantic DTOs (incl. SeekerSkillView, BriefView)
│  │     ├─ routers/
│  │     │  ├─ personas.py
│  │     │  ├─ briefs.py
│  │     │  ├─ stories.py
│  │     │  ├─ interviews.py        # voice interview turn loop
│  │     │  ├─ voice.py             # transcribe, tts
│  │     │  ├─ suggestions.py
│  │     │  ├─ approaches.py
│  │     │  ├─ copilot.py
│  │     │  ├─ followups.py
│  │     │  ├─ organiser.py         # supply-gap, event stats
│  │     │  ├─ fairness.py          # bias mirror
│  │     │  └─ audit.py
│  │     ├─ services/
│  │     │  ├─ llm.py               # provider adapter + retries + fallback
│  │     │  ├─ stt.py
│  │     │  ├─ embeddings.py        # skill index, similarity
│  │     │  ├─ skill_mapper.py      # transcript -> candidate ESCO skills -> constrained pick
│  │     │  ├─ matching.py          # pure, deterministic matching
│  │     │  ├─ interviewer.py       # interview state machines + prompts
│  │     │  ├─ copilot_tools.py
│  │     │  └─ audit.py
│  │     └─ prompts/                # .md prompt files (section 8.6)
│  │  └─ tests/
│  │     ├─ test_matching.py
│  │     ├─ test_fairness_invariance.py
│  │     ├─ test_extraction_schema.py
│  │     └─ test_approach_budget.py
│  └─ web/
│     ├─ package.json
│     ├─ app/
│     │  ├─ layout.tsx
│     │  ├─ page.tsx                     # landing + persona picker
│     │  ├─ company/
│     │  │  ├─ brief/new/page.tsx        # voice brief
│     │  │  ├─ briefs/page.tsx
│     │  │  ├─ briefs/[id]/page.tsx      # edit/publish + suggested candidates
│     │  │  └─ inbox/page.tsx            # approach requests
│     │  ├─ seeker/
│     │  │  ├─ story/page.tsx            # voice story + review/approve
│     │  │  ├─ event/page.tsx            # suggested conversations + browse all
│     │  │  ├─ event/[briefId]/page.tsx  # brief detail + readiness card
│     │  │  └─ followups/page.tsx
│     │  ├─ copilot/page.tsx
│     │  ├─ organiser/
│     │  │  ├─ dashboard/page.tsx        # supply-gap radar
│     │  │  └─ fairness/page.tsx         # bias mirror
│     │  └─ transparency/page.tsx        # audit log + data-used explainer
│     ├─ components/
│     │  ├─ voice/VoiceRecorder.tsx
│     │  ├─ voice/TranscriptPanel.tsx
│     │  ├─ voice/useInterview.ts
│     │  ├─ brief/LiveBriefCard.tsx
│     │  ├─ skills/SkillChip.tsx
│     │  ├─ skills/EvidenceQuote.tsx
│     │  ├─ match/SuggestionCard.tsx
│     │  ├─ match/WhyPanel.tsx
│     │  ├─ match/ApproachBudgetMeter.tsx
│     │  ├─ org/SupplyGapChart.tsx
│     │  ├─ org/BiasMirrorTable.tsx
│     │  ├─ shared/PersonaSwitcher.tsx
│     │  └─ shared/AuditLogTable.tsx
│     └─ lib/
│        ├─ api.ts                       # typed fetch client
│        └─ types.ts                     # mirror of backend schemas
```

---

## 6. Data model and DTOs

### 6.1 Tables (PostgreSQL)

| Table | Key columns |
|---|---|
| `events` | id, name, date, mode (`online`/`in_person`/`hybrid`), status |
| `companies` | id, name, sector, size_band, description |
| `skills` | id, esco_uri (nullable), label, description, cluster (e.g. `data`, `web`, `cloud`, `health_tech`, `customer_support`), embedding (float[]) |
| `briefs` | id, company_id, event_id, title, plain_summary, problem_90_days, status (`draft`/`published`), required_languages (json: [{lang, level}]), international_ok (bool), relocation_support (bool), onboarding_support (text), permit_info_url (nullable), work_mode (`on_site`/`hybrid`/`remote`), tables (int, parallel conversations), slot_minutes (int), created_at |
| `brief_skills` | id, brief_id, skill_id, importance (`must`/`learnable`/`nice`), source_quote (nullable) |
| `seekers` | id, alias (e.g. `Seeker #A12`), display_name (synthetic, hidden until reveal), languages (json), needs_relocation (bool), availability, approach_budget_total (default 5) |
| `skill_stories` | id, seeker_id, status (`draft`/`approved`), approved_at, transcript_text (nullable; deleted on approve unless the seeker keeps it) |
| `story_skills` | id, story_id, skill_id, evidence_quote, seeker_confirmed (bool) |
| `approaches` | id, seeker_id, brief_id, status (`requested`/`accepted`/`declined`/`done`), created_at, decided_at |
| `followups` | id, approach_id, voice_note_text, structured (json: summary, next_step, remind_at), created_at |
| `interview_sessions` | id, kind (`brief`/`story`/`followup`), owner_id, messages (json), draft (json), status |
| `audit_log` | id, ts, actor_role, actor_id, action, payload (json) |
| `fairness_runs` | id, ts, config (json), results (json) |

### 6.2 DTOs that guard the fairness rule

Matching functions accept **only** these. No other fields may be added without review.

```python
# schemas.py
class SkillRef(BaseModel):
    skill_id: int
    label: str

class SeekerSkillView(BaseModel):
    seeker_id: int                      # opaque id only
    skills: list[SkillRef]
    evidence: dict[int, str]            # skill_id -> verbatim quote
    languages: list[LanguageLevel]      # only used against company-STATED language requirements
    needs_relocation: bool              # only used to show a "consideration", never to exclude

class BriefView(BaseModel):
    brief_id: int
    title: str
    must: list[SkillRef]
    learnable: list[SkillRef]
    nice: list[SkillRef]
    required_languages: list[LanguageLevel]
    relocation_support: bool
    on_site: bool

class Reason(BaseModel):
    type: Literal["direct", "transferable", "learnable_gap", "consideration"]
    brief_skill: str | None = None
    seeker_skill: str | None = None
    evidence_quote: str | None = None
    text: str                            # plain-language sentence

class Suggestion(BaseModel):
    brief_id: int
    seeker_id: int
    bucket: Literal["strong", "good", "explore"]
    reasons: list[Reason]
    data_used: list[str]                 # e.g. ["Approved skill story", "Stated languages"]
```

---

## 7. Seed data (synthetic)

Create a seed script `python -m app.seed` that is idempotent.

**Size:** 1 event, 12 companies, 15 published briefs, 40 seekers (about 30 with approved stories, 10 without so the "no story yet" state is visible).

**Diversity that makes the demo meaningful**
- Seekers from varied backgrounds: international candidates, career changers (e.g. nurse to health-tech support; teacher to customer success; hospitality manager to operations), self-taught developers, people with non-standard credentials.
- At least 5 "hidden gem" cases: a seeker whose **job titles** would never match a brief, but whose **evidenced skills** match well (this is the point of the product).
- Briefs from varied sectors: software, data, cloud, health tech, logistics, customer support, hardware testing, finance ops.
- Balanced supply and demand, with deliberate gaps: e.g. demand for cloud security and embedded C exceeds supply; supply of customer support exceeds demand. This feeds the Supply-gap Radar.

**Demo personas (fixed ids, referenced in the demo script)**
- `company_demo`: Nordic Health Data Oy (health-tech), rep "Mika"
- `seeker_demo_a`: career changer, nurse to health-data analyst, intermediate Python, strong domain knowledge
- `seeker_demo_b`: international developer, non-EU degree, strong backend skills, needs relocation info
- `organiser_demo`: Espoo events team

**ESCO**
1. Download the ESCO skills CSV (English) from the ESCO portal. Filter to ~150-300 skills relevant to tech, data, health tech, logistics and customer support, plus ~30 transversal skills (communication, problem solving).
2. If the CSV is not available in time, use `esco_skills_fallback.json` (~120 hand-written skills with `label`, `description`, `cluster`, `esco_uri: null`).
3. On startup, embed all skills once, store embeddings in the DB, and load them into a numpy matrix.

---

## 8. Backend specification

### 8.1 Config and environment

`.env.example`

```
DATABASE_URL=postgresql+psycopg://signal:signal@localhost:5432/signal
LLM_PROVIDER=openai
LLM_API_KEY=
LLM_MODEL=
EMBED_MODEL=
STT_MODEL=
TTS_MODEL=
DEMO_CACHE=0            # 1 = replay cached interview turns for scripted demo personas
APPROACH_BUDGET_DEFAULT=5
MATCH_DIRECT_THRESHOLD=0.85
MATCH_TRANSFERABLE_THRESHOLD=0.70
```

`GET /healthz` returns `{ok: true}` (used by load tests and by the frontend to show a "backend ready" state).

### 8.2 Endpoints

All requests carry `X-Persona-Id` (demo-only auth: the persona picker sets it). Every mutating endpoint writes to `audit_log`.

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/personas` | Demo persona list | n/a | `[{id, role, label}]` |
| GET | `/api/skills?q=` | Search skills | n/a | `[SkillRef]` |
| POST | `/api/voice/transcribe` | Audio to text (audio discarded) | multipart `audio`, `lang?` | `{text}` |
| POST | `/api/voice/tts` | Optional provider TTS | `{text, lang}` | audio stream |
| POST | `/api/interviews` | Start an interview session | `{kind, owner_id}` | `{session_id, first_question}` |
| POST | `/api/interviews/{id}/turn` | One turn of the loop | `{user_text}` | `{assistant_text, draft, done}` |
| POST | `/api/interviews/{id}/finalize` | Extraction to editable draft | n/a | `BriefDraft` or `StoryDraft` |
| GET | `/api/briefs` | List briefs (company: own; seeker: published) | `?status` | `[Brief]` |
| GET/PATCH | `/api/briefs/{id}` | Read/edit brief | partial brief | `Brief` |
| POST | `/api/briefs/{id}/publish` | Publish after human edit | n/a | `Brief` |
| GET | `/api/stories/me` | Seeker's draft or approved story | n/a | `Story` |
| PATCH | `/api/stories/{id}` | Edit skills, remove any skill or quote | partial | `Story` |
| POST | `/api/stories/{id}/approve` | Approve and share; deletes transcript | n/a | `Story` |
| GET | `/api/suggestions/seeker` | Suggested conversations for current seeker | `?event_id` | `[Suggestion]` + `{budget_remaining}` |
| GET | `/api/suggestions/brief/{id}` | Suggested candidates for a brief (alias + approved story only) | n/a | `[Suggestion]` |
| GET | `/api/browse/briefs` | Browse all briefs (nothing hidden) | filters | `[Brief]` |
| POST | `/api/approaches` | Seeker requests a conversation | `{brief_id}` | `Approach` (fails if budget is 0) |
| POST | `/api/approaches/{id}/decide` | Company accepts or declines | `{decision}` | `Approach` + queue estimate |
| GET | `/api/approaches/inbox` | Company inbox | n/a | `[Approach + approved story]` |
| GET | `/api/queue/{brief_id}` | Estimated wait | n/a | `{position, est_minutes}` |
| POST | `/api/copilot/ask` | Attendee question (text from voice or typed) | `{text}` | `{answer, cards:[Suggestion], sources:[brief_ids]}` |
| GET | `/api/briefing` | Pre-conversation briefing | `?brief_id` | `{shared_skills, questions:[2], notes}` |
| POST | `/api/followups` | Post-conversation voice note | `{approach_id, text}` | `Followup` |
| GET | `/api/organiser/supply-gap` | Demand vs. supply by skill and cluster | `?event_id` | `[{skill, cluster, demand, supply, gap}]` |
| GET | `/api/organiser/event-stats` | Approaches, acceptance rate, budget use | n/a | stats |
| POST | `/api/fairness/run` | Run Bias Mirror | `{n_seekers, variations}` | `FairnessReport` |
| GET | `/api/audit` | Audit log (paged) | `?actor&action` | `[AuditEntry]` |

### 8.3 Matching engine (`services/matching.py`)

Pure and deterministic. No LLM. Unit-test it heavily.

```python
def match(seeker: SeekerSkillView, brief: BriefView, sim) -> Suggestion | None:
    """sim(skill_id_a, skill_id_b) -> float in [0, 1] (cosine over embeddings; 1.0 if same id)"""
    reasons, direct, transferable = [], 0, 0

    for m in brief.must:
        best_skill, best_sim = max(
            ((s, sim(m.skill_id, s.skill_id)) for s in seeker.skills),
            key=lambda t: t[1], default=(None, 0.0),
        )
        if best_sim >= DIRECT:
            direct += 1
            reasons.append(Reason(type="direct", brief_skill=m.label,
                seeker_skill=best_skill.label, evidence_quote=seeker.evidence.get(best_skill.skill_id),
                text=f"Evidence of {m.label} in their own words"))
        elif best_sim >= TRANSFERABLE:
            transferable += 1
            reasons.append(Reason(type="transferable", brief_skill=m.label,
                seeker_skill=best_skill.label, evidence_quote=seeker.evidence.get(best_skill.skill_id),
                text=f"{best_skill.label} is a related skill that can carry over to {m.label}"))

    n_must = max(len(brief.must), 1)
    coverage = (direct + 0.5 * transferable) / n_must

    # learnable skills: informational only, never reduce coverage
    for l in brief.learnable:
        if not any(sim(l.skill_id, s.skill_id) >= TRANSFERABLE for s in seeker.skills):
            reasons.append(Reason(type="learnable_gap", brief_skill=l.label,
                text=f"{l.label} can be learned on the job according to the company"))

    # considerations (shown, never used to exclude)
    # - brief.required_languages not covered by seeker.languages -> "The company states X is required"
    # - seeker.needs_relocation and not brief.relocation_support -> "Relocation support is not offered"

    bucket = ("strong" if coverage >= 0.75 else "good" if coverage >= 0.5
              else "explore" if coverage >= 0.3 else None)
    if bucket is None:
        return None
    return Suggestion(brief_id=brief.brief_id, seeker_id=seeker.seeker_id, bucket=bucket,
                      reasons=reasons, data_used=["Approved skill story", "Stated languages"])
```

Rules for the engine:
- Show **buckets and reasons** to users, never the numeric coverage.
- Ordering: bucket, then coverage (internal), then a deterministic hash tiebreak (`hash(event_id, seeker_id, brief_id)`) so ties are not always resolved by database order.
- No exclusions: items below the "explore" bucket remain reachable through `/api/browse/briefs`.
- Thresholds are env-configurable. Calibrate on the seed data so the 5 "hidden gem" cases land in `good` or `strong`.
- Language is treated as a **company-stated requirement** displayed as a consideration, not as a hidden filter.

### 8.4 Skill mapper (`services/skill_mapper.py`)

Goal: map free speech to ESCO skills **without letting the LLM invent skills**.

1. Split the transcript into sentences or chunks of 1-2 sentences.
2. Embed each chunk and retrieve the top-K (K = 15) closest ESCO skills per chunk, merging into a candidate list (about 30-60 skills).
3. Call the LLM with the transcript plus **only the candidate list** (ids and labels) and ask it to select skills with direct evidence, quoting the transcript verbatim.
4. Validate: each returned `skill_id` must be in the candidate list, and each `evidence_quote` must be an exact substring of the transcript (case-insensitive, whitespace-normalised). Drop anything that fails and log it.
5. Return `[ {skill_id, label, evidence_quote} ]`.

For briefs, use the same approach and ask the LLM to also classify importance (`must`, `learnable`, `nice`) based on what the company representative said ("we need", "must", "can learn", "nice to have").

### 8.5 Interview loop (`services/interviewer.py`, `routers/interviews.py`)

Turn-based, not streaming. Flow per turn:

```
browser: record audio (push-to-talk) -> POST /api/voice/transcribe -> text
browser: POST /api/interviews/{id}/turn {user_text}
server: append message; run interviewer LLM with state + draft; update running draft (cheap extraction every turn)
server: return {assistant_text, draft, done}
browser: show captions, speak assistant_text (speechSynthesis), update LiveBriefCard / skill preview
```

Interview state machines (keep in code, not only in the prompt):

**Brief interview** asks about: (1) the problem this person solves in the first 90 days, (2) the top 3 skills without which they cannot start, (3) what can be learned on the job, (4) working languages and level, (5) whether international candidates are welcome and what relocation/onboarding support exists, (6) work mode and location. Ends after the six topics or 8 turns.

**Story interview** asks for 3 real situations: (1) something they built, fixed or organised that they are proud of, (2) a time they learned something new quickly, (3) a task where they worked with other people. Plus: which languages they work in. Ends after 3 stories or 8 turns.

**Follow-up note** is a single-turn extraction (see 8.6).

Robustness:
- 20-second timeout per LLM call, one retry, then **fallback to a scripted question list** so the demo never dies.
- If STT fails, the UI shows a text box (always present).
- `DEMO_CACHE=1`: if the persona is a demo persona and `demo_scripts.json` has a cached turn for the same input hash, return it instantly.

### 8.6 Prompts (store as files in `app/prompts/`)

**`interviewer_story.md` (system)**
```
You are a friendly interviewer helping a jobseeker explain what they can do. You are not a recruiter and you do not evaluate or score the person.
Rules:
- Ask ONE short question at a time, in the person's language (Finnish, Swedish or English).
- Ask for concrete real situations: what they did, how, with what tools, and the result.
- Do NOT ask about age, nationality, origin, family, health, religion, politics, or photos.
- Do NOT comment on accent, fluency, tone or emotions.
- Encourage specifics ("What did you actually do yourself?").
- When you have enough (3 situations or 8 turns), say you have enough and thank them.
Return JSON: {"assistant_text": str, "done": bool}
```

**`interviewer_brief.md` (system)**
```
You help a company representative describe a hiring need clearly. You are not evaluating any candidate.
Cover: 90-day problem, must-have skills, learnable skills, languages and level, international candidates and relocation/onboarding support, work mode.
Ask ONE short question at a time. Push gently for concrete skills instead of job titles or buzzwords.
Do NOT ask for or suggest preferences about age, gender, nationality, origin, family status, or education institution.
If the representative states such a preference, say that it cannot be used and ask for the underlying skill need instead.
Return JSON: {"assistant_text": str, "done": bool}
```

**`extract_story.md`**
```
Select skills from CANDIDATES that the speaker demonstrates in TRANSCRIPT.
For each, return skill_id (from CANDIDATES only) and evidence_quote (an exact substring of TRANSCRIPT).
Do not infer skills without direct evidence. Do not include personal attributes. Do not judge quality or level.
Return JSON: {"skills":[{"skill_id":int,"evidence_quote":str}]}
```

**`extract_brief.md`**
```
From TRANSCRIPT, build a structured hiring brief using CANDIDATES for skills.
Return JSON: {
 "title": str, "plain_summary": str (<=2 sentences, no buzzwords), "problem_90_days": str,
 "skills":[{"skill_id":int,"importance":"must|learnable|nice","source_quote":str}],
 "required_languages":[{"lang":str,"level":str}],
 "international_ok": bool, "relocation_support": bool, "onboarding_support": str,
 "work_mode": "on_site|hybrid|remote"
}
Remove any requirement about age, gender, nationality or school and list removed items in "removed_requirements".
```

**`followup_extract.md`**
```
From the attendee's voice note, return JSON: {"summary": str (<=2 sentences), "next_step": str, "remind_in_days": int|null}. Use only what was said.
```

**`briefing.md`**
```
Using ONLY the structured data given (shared skills, brief summary, company-stated needs), write: (1) two short questions the attendee could ask the company, (2) one sentence on what they have in common. Do not guess personal details.
Return JSON: {"questions":[str,str], "common":str}
```

**`copilot.md`**
```
You are a private assistant for one event attendee. Use the provided tools to answer; never invent companies or facts.
You may suggest conversations and explain why. You never rank people, never decide, and never reveal other attendees' data.
Answer in at most 3 sentences and reference the briefs you used.
```

Copilot tools (function calling): `get_my_suggestions(limit)`, `get_brief_summary(brief_id)`, `get_queue_estimate(brief_id)`, `get_my_budget()`. The endpoint returns the answer plus the cards used, so the UI can show sources.

### 8.7 Approaches, budget and queue

- Budget: `approach_budget_total` per seeker per event (default 5). `POST /api/approaches` decrements atomically (single SQL update with `WHERE remaining > 0`). Return 409 with a friendly message when empty.
- Declining returns the budget point to the seeker (so a decline is not a penalty for the seeker).
- Queue: `est_minutes = ceil(accepted_waiting / tables) * slot_minutes`.
- Idempotent: one active approach per seeker and brief.
- Concurrency test: 50 parallel approaches never exceed the budget.

### 8.8 Bias Mirror (`routers/fairness.py`)

1. Sample N seekers (default 20) with approved stories.
2. For each, create **counterfactual variants** that change only non-skill attributes: alias or synthetic display name, nationality marker, university name, a non-required language, career-path label.
3. Recompute `/suggestions/seeker` for each variant.
4. Report per attribute: share of seekers whose suggestion set (ids, buckets) is identical, plus a list of any differences.
5. Expected result: 100% identical (the matching DTOs do not contain those fields). The value of the page is that it **proves** this live and would catch a future regression.
6. Also run an "attribute leak scan" test: introspect the DTO classes and fail if any field name matches a banned list (`name`, `nationality`, `age`, `gender`, `school`, `university`, `photo`, `address`).

Stretch (contrast demo): implement a naive matcher that sends a CV text blob to an LLM; show on the same page that swapping the name or school changes its output while Signal's does not. Label it clearly as a contrast, not part of the product.

### 8.9 Supply-gap Radar

- `demand[skill]` = count of published briefs where the skill is `must` (weight 1.0) or `learnable` (weight 0.3).
- `supply[skill]` = count of seekers with an **approved** story containing a direct or transferable match (use the same `sim` thresholds).
- `gap = demand - supply`. Aggregate by `cluster`. Only aggregates leave the server (never seeker ids).
- Suppress any cell with fewer than 3 contributing seekers to avoid re-identification ("small-number suppression").

### 8.10 Audit log

Write on: brief publish, story approve, approach create/decide, suggestion view, fairness run, any LLM call (store the prompt file name and the input ids, not full transcripts). The `/transparency` page shows these in plain language ("2 minutes ago: Your skill story was shared with Nordic Health Data Oy").

### 8.11 Privacy implementation checklist
- Audio never written to disk (read multipart into memory, send to STT, discard).
- `skill_stories.transcript_text` is deleted on approve (default) unless the seeker chooses to keep it.
- A "Delete my data" button on the seeker pages deletes story, approaches and followups for the persona.
- Company views never contain `display_name` before an approach is accepted.
- Logs never contain transcripts.

---

## 9. Frontend specification

### 9.1 Design principles
- Mobile-first (attendees are on phones at the event), large tap targets, 16px minimum body text.
- Calm, trustworthy look: plenty of whitespace, one accent colour, no dark patterns.
- Every AI-produced item carries a small "AI-assisted, you decide" label and an edit control.
- Captions for all voice. Keyboard accessible. `aria-live="polite"` on the transcript.
- EN by default; structure strings for later FI/SV (single `messages.ts`).

### 9.2 Pages

| Route | Purpose | Key UI |
|---|---|---|
| `/` | Landing and persona picker | Three cards (Company, Jobseeker, Organiser) that set `X-Persona-Id`; one-line promise; link to `/transparency` |
| `/company/brief/new` | Voice Hiring Brief | Left: VoiceRecorder + TranscriptPanel. Right: LiveBriefCard that updates every turn. Bottom: "Edit and publish" |
| `/company/briefs` | List | Cards with status and number of suggested candidates |
| `/company/briefs/[id]` | Edit, publish, candidates | Editable fields; skill chips with importance toggle; International Readiness card; list of suggested candidates (alias + approved story + WhyPanel) with "Invite to talk" |
| `/company/inbox` | Requests | Request cards with the seeker's approved story; Accept/Decline; queue and table settings |
| `/seeker/story` | Voice Skill Story | VoiceRecorder, TranscriptPanel, live skill preview. After finishing: **Review screen** where each skill shows its evidence quote; remove, add (search), edit; "Approve and share" with a clear explanation of who will see what |
| `/seeker/event` | Suggested Conversations | ApproachBudgetMeter at top; 5-8 SuggestionCards (bucket badge, summary, 2 reasons, "Why?" and "Ask to talk" buttons); tab "Browse all" with filters; empty state when there is no approved story |
| `/seeker/event/[briefId]` | Brief detail | Plain summary, 90-day problem, skills by importance, International Readiness card, queue estimate, briefing preview |
| `/seeker/followups` | After the event | Voice note recorder per conversation; follow-up digest list with next steps and reminder dates |
| `/copilot` | Event Copilot | Big push-to-talk button, typed fallback, answer with source cards; "Brief me" button before a conversation |
| `/organiser/dashboard` | Supply-gap Radar and stats | Heatmap or grouped bar by cluster; list of top uncovered needs; stats on approaches and acceptance; export as CSV |
| `/organiser/fairness` | Bias Mirror | "Run check" button; table of attributes varied vs. % unchanged; green/red badges; list of differences (empty when passing); optional contrast panel |
| `/transparency` | Trust page | "What Signal uses and never uses" two-column list; audit log table; how to delete your data |

### 9.3 Key components

**`VoiceRecorder.tsx`**
- Props: `onTranscript(text)`, `lang`, `disabled`, `mode: "push" | "toggle"`.
- Primary path: `navigator.mediaDevices.getUserMedia({audio:true})` and `MediaRecorder` (choose supported mime type: `audio/webm;codecs=opus`, else `audio/mp4`). On stop, POST the blob to `/api/voice/transcribe`.
- Fallback path (Chrome/Edge): `SpeechRecognition` with `lang` (`fi-FI`, `sv-SE`, `en-GB`).
- Always show: recording indicator, elapsed time, "Type instead" link, permission-denied message with instructions.
- Max single recording: 90 seconds.

**`useInterview.ts`** (hook)
- State: `sessionId`, `messages`, `draft`, `status` (`idle|listening|transcribing|thinking|speaking|done`), `error`.
- `start(kind)`, `sendUserText(text)`, `finalize()`.
- Speaks `assistant_text` with `speechSynthesis` (voice picked by language), with a mute toggle.

**`LiveBriefCard.tsx`**: renders partial `BriefDraft` with skeleton states; skill chips animate in; each chip has an importance toggle and delete.

**`SkillChip.tsx` / `EvidenceQuote.tsx`**: chip with tooltip or expandable quote: "In your words: '...'".

**`SuggestionCard.tsx`**: bucket badge (Strong / Good / Explore, with text, not colour only), company, one-line summary, top two reasons, actions.

**`WhyPanel.tsx`**: slide-over listing: reasons with quotes, "Data used", "Data not used (name, nationality, age, school...)", and "You decide. Nobody is rejected automatically."

**`ApproachBudgetMeter.tsx`**: 5 dots; remaining count; helper text ("Choose conversations you care about most").

**`SupplyGapChart.tsx`**: Recharts bar/heatmap, tooltip with demand/supply; cells under the privacy threshold show "fewer than 3".

**`BiasMirrorTable.tsx`**: rows = attribute varied, columns = % identical, N tested, status badge.

### 9.4 Data fetching and types
- `lib/api.ts`: typed wrapper adding `X-Persona-Id` from cookie; throws typed errors (`BudgetExhausted`, `NotApproved`).
- `lib/types.ts`: hand-mirror of backend DTOs (or generate from the OpenAPI schema: `openapi-typescript http://localhost:8000/openapi.json`).
- TanStack Query keys: `['suggestions', personaId]`, `['brief', id]`, `['story', personaId]`, `['audit']`.
- Optimistic update only for approach budget; everything else refetch on mutation.

### 9.5 UX details that matter for judges
- Always show "You decide" language near any AI output.
- Review/approve screen must make it obvious what will be shared and with whom.
- Empty and error states for voice permission, STT failure and LLM timeout.
- A visible "Demo mode" ribbon when `DEMO_CACHE=1` (be honest about cached turns).

---

## 10. Testing

**Backend (pytest)**
- `test_matching.py`: golden cases (direct, transferable, hidden-gem, no-match), threshold edge cases, deterministic ordering.
- `test_fairness_invariance.py`: for 30 seekers, mutate banned attributes in the DB and assert identical suggestions; plus the DTO field-name guard.
- `test_extraction_schema.py`: mock LLM returning invalid skill ids and non-substring quotes; assert they are dropped.
- `test_approach_budget.py`: concurrent approaches never exceed the budget; decline refunds.
- `test_privacy.py`: after approve, transcript is null; company endpoints contain no `display_name` before accept.

**Frontend**
- One Playwright smoke test of the full demo path (persona to brief to story to suggestion to approach to accept).
- Manual checks: iPhone Safari and Android Chrome for recording; keyboard-only navigation; screen reader pass on the review screen.

**Voice**
- Test Finnish, Swedish and English samples early (Phase 4). If Finnish quality is weak, keep English as the main demo language and show Finnish as a supported-with-caveats bonus.

**Load (stretch)**
- k6 script: 300 virtual users hitting `/healthz`, `/api/browse/briefs`, `/api/suggestions/seeker`. Report p95 latency. Add a response cache on read-only endpoints (short TTL) and show the result on a slide about event-start login spikes.

---

## 11. Build phases (with a Cursor prompt for each)

Estimated for about 24 hours of work by 1-2 people. **MVP cut line = end of Phase 6 plus the Bias Mirror part of Phase 8.**

### Phase 0: Scaffolding (1h)
Prompt:
> Read @docs/PLAN.md sections 4, 5 and 8.1. Create the monorepo structure, `docker-compose.yml` (PostgreSQL 16), `.env.example`, a FastAPI app with `/healthz`, and a Next.js 14 + TypeScript + Tailwind + shadcn/ui app with a landing page. Add Ruff, ESLint, a Makefile with `make dev`, `make seed`, `make test`. Do not build any features yet.

### Phase 1: Data model, seed, skills index (2h)
Prompt:
> Implement section 6 (SQLAlchemy models and Pydantic DTOs) and section 7 (seed script). Load skills from `data/esco_skills_subset.csv` or the fallback JSON, embed them using the configured embedding model, and store embeddings. Create `embeddings.py` with `sim(skill_a, skill_b)` backed by a numpy matrix loaded at startup. Generate seed JSON for 12 companies, 15 briefs, 40 seekers with the diversity and hidden-gem cases described. Make the seed idempotent.

### Phase 2: Matching engine and suggestion endpoints (2h)
Prompt:
> Implement `services/matching.py` exactly as described in section 8.3, plus `/api/suggestions/seeker`, `/api/suggestions/brief/{id}`, `/api/browse/briefs`. Matching functions must accept only `SeekerSkillView` and `BriefView`. Write `test_matching.py` and `test_fairness_invariance.py` including the DTO banned-field guard. Calibrate thresholds so the hidden-gem seed cases land in good or strong.

### Phase 3: Frontend shell and Suggested Conversations (3h)
Prompt:
> Build the persona picker, the layout with `PersonaSwitcher`, `lib/api.ts`, and the `/seeker/event` page with `SuggestionCard`, `WhyPanel` and `ApproachBudgetMeter` per section 9. Mobile-first. Include a Browse All tab. Use seeded data. No voice yet.

### Phase 4: Voice pipeline and Voice Hiring Brief (4h)
Prompt:
> Implement `/api/voice/transcribe` (audio in memory only), `services/llm.py` (adapter, JSON mode, 20s timeout, one retry, scripted fallback), `services/skill_mapper.py` (section 8.4), `services/interviewer.py` and `/api/interviews` endpoints for the brief interview (section 8.5, prompts from 8.6). On the frontend build `VoiceRecorder`, `TranscriptPanel`, `useInterview`, `LiveBriefCard` and the `/company/brief/new` page. Add edit and publish. Always provide a text input alternative and live captions.

### Phase 5: Voice Skill Story with review and approve (3h)
Prompt:
> Reuse the interview loop for the story interview. Implement story extraction with evidence validation (quotes must be exact substrings, skill ids must come from the candidate list). Build `/seeker/story` with the review screen: every skill shows its quote, can be removed or added, and "Approve and share" explains who sees what. On approve, delete the transcript. Add `test_extraction_schema.py` and `test_privacy.py`.

### Phase 6: Approaches, budget, inbox, queue (2h)
Prompt:
> Implement section 8.7 and the company inbox. Atomic budget decrement, refund on decline, one active approach per seeker and brief, queue estimate. Frontend: "Ask to talk" button wiring, `/company/inbox` with the seeker's approved story and Accept/Decline, `/company/briefs/[id]` with suggested candidates (alias only). Add `test_approach_budget.py` with a concurrency case.

*(MVP cut line is here; add the Bias Mirror from Phase 8 before demoing.)*

### Phase 7: Organiser dashboard (2h)
Prompt:
> Implement `/api/organiser/supply-gap` (section 8.9, with small-number suppression) and `/api/organiser/event-stats`. Build `/organiser/dashboard` with `SupplyGapChart`, top uncovered needs, stats, and CSV export.

### Phase 8: Bias Mirror and Transparency (2h)
Prompt:
> Implement `/api/fairness/run` (section 8.8), the `/organiser/fairness` page with `BiasMirrorTable`, the audit log writer across all mutating endpoints, `/api/audit`, and the `/transparency` page with "What Signal uses and never uses", the audit log table and a "Delete my data" button.

### Phase 9: Event Copilot, briefing and follow-ups (3h)
Prompt:
> Implement `/api/copilot/ask` with function calling using the four tools in section 8.6, `/api/briefing`, and `/api/followups` (voice note to structured follow-up). Build `/copilot` (push-to-talk, typed fallback, source cards, "Brief me") and `/seeker/followups`. Answers must only use tool results.

### Phase 10: Polish, demo mode, load test, docs (2h)
Prompt:
> Add `DEMO_CACHE` replay for the demo personas using `data/seed/demo_scripts.json` (record real turns once, then replay), a visible demo-mode ribbon, empty/error states for voice and LLM failures, a README with setup and the demo script, and a k6 script plus short-TTL caching for read endpoints. Run the Playwright smoke test.

---

## 12. Cursor project rules (`.cursor/rules/signal.mdc`)

```
---
description: Signal project rules
alwaysApply: true
---
- Follow docs/PLAN.md. Build only the phase I name.
- Matching code accepts only SeekerSkillView and BriefView. Never add name, nationality, age, gender, school, photo or address fields to them.
- Never use an LLM to score, rank, accept or reject a person. LLMs may extract, explain and draft only.
- Skills from LLMs must come from the provided candidate list; quotes must be exact substrings of the transcript. Validate in code.
- Audio is never stored. Transcripts are not logged.
- Every mutating endpoint writes to audit_log.
- Every voice feature must have a text fallback and captions.
- Use synthetic data only. Never add real personal data or real API keys to the repo.
- Python: type hints, Pydantic v2, SQLAlchemy 2 style, Ruff. TypeScript: strict mode, no any.
- Write or update tests with every backend change. Keep functions small and pure where possible.
- Prefer simple, readable solutions over clever ones. Ask before adding a new dependency.
```

---

## 13. Demo script (about 4 minutes)

1. **Hook (20s):** "CVs are written by AI and screened by AI. Signal helps people explain themselves, and humans do the matching."
2. **Company (60s):** persona `company_demo` speaks for about 45 seconds about a health-data role; the brief builds live; the rep removes a vague requirement and publishes. Point out the International Readiness card.
3. **Jobseeker (60s):** persona `seeker_demo_a` (nurse turned analyst) has a short voice conversation; show the **evidence quote under each skill**; remove one skill; approve and share.
4. **Suggested Conversations (40s):** the same seeker sees Nordic Health Data Oy as "Strong", opens "Why this suggestion?", uses one budget point. Mention that the job titles would not have matched, but the evidenced skills do.
5. **Company side (20s):** the rep sees the request with the approved story (alias only), accepts, and the queue estimate appears.
6. **Organiser (40s):** Supply-gap Radar shows unmet demand for cloud security; Bias Mirror shows 100% identical suggestions across name, nationality and school changes.
7. **Close (20s):** "Humans decide, AI helps people be understood. Nothing is hidden, nothing is scored, everything is explained."

**Slides (6-8):** problem; what we built (3 screens); how voice and evidence work; fairness and privacy design (what we use and never use); EU AI Act design intent (decision support, human oversight, transparency, data minimisation, no emotion inference); organiser value; next steps (pilot at a real Espoo event, event-platform integration, FI/SV languages).

---

## 14. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Voice API latency or outage | Text input is always present; scripted fallback questions; `DEMO_CACHE=1` replay |
| Weak Finnish transcription | English as the main demo language; show Finnish as a supported bonus with a caveat |
| LLM returns invalid JSON or invented skills | Schema validation, candidate-list constraint, quote substring check, one retry |
| ESCO CSV not ready | Use `esco_skills_fallback.json` and keep `esco_uri` null |
| Matching looks arbitrary in the demo | Calibrate thresholds on seed data; keep reasons concise with quotes |
| Judges worry about bias | Bias Mirror live, banned-field test, "what we never use" list |
| Too much scope | Stop at the MVP cut line; the rest goes on the next-steps slide |
| Browser mic permissions fail on a demo machine | Test on the exact demo device; keep a recorded 60-second video as backup |
