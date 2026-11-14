from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.llm import LLMError, chat_json

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"

SUPPORTED_LANGS = ("en", "fi", "sv", "uk")
LANG_NAMES = {"en": "English", "fi": "Finnish", "sv": "Swedish", "uk": "Ukrainian"}

OPENING: dict[str, dict[str, str]] = {
    "brief": {
        "en": (
            "Hi — let's draft a job listing together. "
            "In plain words, what are you hiring for, and what problem should this person solve?"
        ),
        "fi": (
            "Hei — laaditaan työilmoitus yhdessä. "
            "Kerro omin sanoin, ketä olette palkkaamassa ja mikä ongelma hänen pitäisi ratkaista?"
        ),
        "sv": (
            "Hej — låt oss skriva en jobbannons tillsammans. "
            "Berätta med egna ord vem ni söker och vilket problem personen ska lösa?"
        ),
        "uk": (
            "Привіт — давайте разом складемо оголошення про вакансію. "
            "Простими словами: кого ви наймаєте і яку проблему ця людина має вирішити?"
        ),
    },
    "story": {
        "en": (
            "Tell me about something you built, fixed or organised that you are proud of. "
            "What did you do yourself?"
        ),
        "fi": (
            "Kerro jostakin, jonka olet rakentanut, korjannut tai järjestänyt ja josta olet ylpeä. "
            "Mitä teit itse?"
        ),
        "sv": (
            "Berätta om något du har byggt, fixat eller organiserat som du är stolt över. "
            "Vad gjorde du själv?"
        ),
        "uk": (
            "Розкажіть про щось, що ви створили, полагодили чи організували і чим пишаєтеся. "
            "Що саме ви зробили самі?"
        ),
    },
}

# Topic order for the brief interview (section 8.5 of the plan).
BRIEF_TOPICS = (
    "problem_90_days",
    "must_skills",
    "learnable_skills",
    "languages",
    "international",
    "work_mode",
)
STORY_TOPICS = ("built", "learned", "teamwork", "languages")

TOPIC_QUESTIONS: dict[str, dict[str, str]] = {
    "problem_90_days": {
        "en": "What should this person actually get done in the first 90 days?",
        "fi": "Mitä tämän henkilön pitäisi saada aikaan ensimmäisten 90 päivän aikana?",
        "sv": "Vad ska personen faktiskt ha fått gjort under de första 90 dagarna?",
        "uk": "Що ця людина має зробити за перші 90 днів?",
    },
    "must_skills": {
        "en": "Which skills must they already have on day one, in concrete terms?",
        "fi": "Mitkä taidot hänellä pitää olla jo ensimmäisenä päivänä, konkreettisesti?",
        "sv": "Vilka färdigheter måste personen ha redan första dagen, konkret?",
        "uk": "Які навички мають бути в людини вже з першого дня, конкретно?",
    },
    "learnable_skills": {
        "en": "What would you be happy for them to learn on the job?",
        "fi": "Mitä hän voisi mielestäsi oppia työn ohessa?",
        "sv": "Vad kan personen gärna lära sig på jobbet?",
        "uk": "Чого людина може навчитися вже на роботі?",
    },
    "languages": {
        "en": "Which languages do they need to work in, and roughly at what level?",
        "fi": "Millä kielillä hänen pitää työskennellä ja suunnilleen millä tasolla?",
        "sv": "Vilka språk behöver personen arbeta på, och ungefär på vilken nivå?",
        "uk": "Якими мовами людині потрібно працювати і приблизно на якому рівні?",
    },
    "international": {
        "en": (
            "Are international candidates welcome — and is there relocation or onboarding support?"
        ),
        "fi": (
            "Ovatko kansainväliset hakijat tervetulleita — "
            "ja onko tarjolla muutto- tai perehdytystukea?"
        ),
        "sv": (
            "Är internationella kandidater välkomna — "
            "och finns det stöd för flytt eller introduktion?"
        ),
        "uk": (
            "Чи вітаєте ви міжнародних кандидатів — "
            "і чи є підтримка з переїздом або адаптацією?"
        ),
    },
    "work_mode": {
        "en": "Is this on-site, hybrid, or remote?",
        "fi": "Onko työ paikan päällä, hybridinä vai etänä?",
        "sv": "Är jobbet på plats, hybrid eller på distans?",
        "uk": "Це робота в офісі, гібридна чи віддалена?",
    },
    "built": {
        "en": "Tell me about something you built, fixed or organised that you are proud of.",
        "fi": (
            "Kerro jostakin, jonka olet rakentanut, korjannut tai järjestänyt "
            "ja josta olet ylpeä."
        ),
        "sv": "Berätta om något du har byggt, fixat eller organiserat som du är stolt över.",
        "uk": "Розкажіть про щось, що ви створили, полагодили чи організували.",
    },
    "learned": {
        "en": "Now tell me about a time you had to learn something new quickly. How did you do it?",
        "fi": (
            "Kerro nyt tilanteesta, jossa jouduit oppimaan jotain uutta nopeasti. "
            "Miten teit sen?"
        ),
        "sv": "Berätta nu om en gång du behövde lära dig något nytt snabbt. Hur gjorde du?",
        "uk": (
            "Тепер розкажіть, як вам довелося швидко навчитися чогось нового. "
            "Як ви це зробили?"
        ),
    },
    "teamwork": {
        "en": "Tell me about a task where you worked with other people. What was your part?",
        "fi": "Kerro tehtävästä, jossa teit työtä muiden kanssa. Mikä oli sinun osuutesi?",
        "sv": "Berätta om en uppgift där du arbetade med andra. Vad var din del?",
        "uk": "Розкажіть про завдання, де ви працювали з іншими. Яка була ваша роль?",
    },
}

ACK = {
    "en": "Thanks — you mentioned “{snippet}”.",
    "fi": "Kiitos — mainitsit: ”{snippet}”.",
    "sv": "Tack — du nämnde ”{snippet}”.",
    "uk": "Дякую — ви згадали «{snippet}».",
}

DIG_DEEPER = {
    "en": (
        "Could you say a bit more about that — what did you do yourself, "
        "with which tools, and what was the result?"
    ),
    "fi": (
        "Kertoisitko siitä vähän lisää — mitä teit itse, millä työkaluilla "
        "ja mikä oli lopputulos?"
    ),
    "sv": (
        "Kan du berätta lite mer — vad gjorde du själv, med vilka verktyg, "
        "och vad blev resultatet?"
    ),
    "uk": (
        "Розкажіть трохи більше — що ви зробили самі, якими інструментами "
        "і який був результат?"
    ),
}

WRAP_UP = {
    "brief": {
        "en": (
            "Perfect — I have enough to draft a job listing from this. "
            "You can review it on the right and list it when you're happy."
        ),
        "fi": (
            "Hienoa — minulla on tarpeeksi tietoa ilmoitusluonnokseen. "
            "Voit tarkistaa sen oikealla ja julkaista, kun olet tyytyväinen."
        ),
        "sv": (
            "Perfekt — jag har nog för att skriva ett utkast. "
            "Granska det till höger och publicera när du är nöjd."
        ),
        "uk": (
            "Чудово — цього достатньо для чернетки оголошення. "
            "Перегляньте її праворуч і опублікуйте, коли будете готові."
        ),
    },
    "story": {
        "en": (
            "Thank you — I have enough to draft your skills. "
            "Next you'll review every skill and quote before anything is shared."
        ),
        "fi": (
            "Kiitos — minulla on tarpeeksi taitojesi luonnokseen. "
            "Seuraavaksi tarkistat jokaisen taidon ja lainauksen ennen kuin mitään jaetaan."
        ),
        "sv": (
            "Tack — jag har nog för att skissa dina färdigheter. "
            "Nu granskar du varje färdighet och citat innan något delas."
        ),
        "uk": (
            "Дякую — цього достатньо для чернетки ваших навичок. "
            "Далі ви перевірите кожну навичку й цитату, перш ніж щось буде поширено."
        ),
    },
}

ALMOST_THERE = {
    "en": "Almost there — I still need a bit more on {gap}. Could you clarify that?",
    "fi": (
        "Melkein valmista — tarvitsen vielä hieman lisää aiheesta: {gap}. "
        "Voisitko tarkentaa?"
    ),
    "sv": "Nästan klart — jag behöver lite mer om {gap}. Kan du förtydliga?",
    "uk": "Майже готово — мені ще потрібно трохи більше про {gap}. Можете уточнити?",
}

# Keyword hints (lower-case, several languages) used only to decide which topic to ask next.
TOPIC_HINTS: dict[str, tuple[str, ...]] = {
    "problem_90_days": (
        "90",
        "first months",
        "ensimmäis",
        "första",
        "goal",
        "tavoite",
        "mål",
        "solve",
        "fix",
    ),
    "must_skills": (
        "must",
        "need",
        "required",
        "experience",
        "pitää osata",
        "täytyy",
        "måste",
        "behöver",
    ),
    "learnable_skills": ("learn", "oppia", "lära", "train", "teach", "onboard"),
    "languages": (
        "english",
        "finnish",
        "swedish",
        "ukrainian",
        "language",
        "englanti",
        "suomi",
        "ruotsi",
        "engelska",
        "finska",
        "svenska",
        "kieli",
        "språk",
        "мов",
    ),
    "international": (
        "international",
        "relocat",
        "visa",
        "permit",
        "kansainväl",
        "muutto",
        "internationell",
        "flytt",
    ),
    "work_mode": (
        "remote",
        "hybrid",
        "on-site",
        "onsite",
        "office",
        "etä",
        "toimisto",
        "distans",
        "kontor",
        "på plats",
    ),
    "learned": ("learn", "oppi", "lärde", "course", "kurssi", "kurs", "taught myself", "new"),
    "teamwork": (
        "team",
        "together",
        "colleague",
        "tiimi",
        "yhdessä",
        "kollega",
        "tillsammans",
        "команд",
    ),
}

EMPTY_BRIEF_DRAFT: dict[str, Any] = {
    "title": "",
    "plain_summary": "",
    "problem_90_days": "",
    "must_skills": [],
    "learnable_skills": [],
    "nice_skills": [],
    "required_languages": [],
    "international_ok": None,
    "relocation_support": None,
    "onboarding_support": "",
    "work_mode": "",
    "missing": ["role purpose", "90-day problem", "must-have skills"],
    "clarifications_asked": [],
}


def normalize_lang(code: str | None) -> str:
    short = (code or "en").strip().lower()[:2]
    return short if short in SUPPORTED_LANGS else "en"


def opening_line(kind: str, lang: str = "en") -> str:
    lines = OPENING["brief" if kind == "brief" else "story"]
    return lines[normalize_lang(lang)]


def _load_prompt(name: str) -> str:
    path = PROMPTS / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def _merge_draft(base: dict[str, Any], update: dict[str, Any] | None) -> dict[str, Any]:
    out = {**EMPTY_BRIEF_DRAFT, **(base or {})}
    if not update:
        return out
    for key, value in update.items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip() and out.get(key):
            continue
        if isinstance(value, list) and not value and out.get(key):
            continue
        out[key] = value
    return out


def _critical_missing(draft: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    if not draft.get("title") and not draft.get("plain_summary"):
        missing.append("what the role is for")
    if not draft.get("problem_90_days"):
        missing.append("the first 90-day problem")
    if not draft.get("must_skills"):
        missing.append("must-have skills")
    if not draft.get("work_mode"):
        missing.append("work mode")
    return missing


def _user_texts(messages: list[dict[str, str]]) -> list[str]:
    return [m.get("content", "") for m in messages if m.get("role") == "user" and m.get("content")]


def snippet(text: str, max_words: int = 9) -> str:
    """Short verbatim excerpt of what the person said, for acknowledging it."""
    words = " ".join(text.split()).split(" ")
    cut = " ".join(words[:max_words]).rstrip(".,;:!?")
    return cut + ("…" if len(words) > max_words else "")


def covered_topics(kind: str, messages: list[dict[str, str]]) -> set[str]:
    """Topics already touched, judged by keywords in what the person said."""
    text = " ".join(_user_texts(messages)).lower()
    topics = BRIEF_TOPICS if kind == "brief" else STORY_TOPICS
    covered = {t for t in topics if any(h in text for h in TOPIC_HINTS.get(t, ()))}
    if kind == "story" and _user_texts(messages):
        covered.add("built")
    return covered


def contextual_fallback(
    kind: str,
    messages: list[dict[str, str]],
    lang: str = "en",
) -> tuple[str, bool]:
    """Scripted but context-aware next question, used when the LLM is unavailable."""
    lang = normalize_lang(lang)
    users = _user_texts(messages)
    if not users:
        return opening_line(kind, lang), False

    last = users[-1]
    ack = ACK[lang].format(snippet=snippet(last))
    if kind == "story" and len(last.split()) < 15:
        return f"{ack} {DIG_DEEPER[lang]}", False

    topics = BRIEF_TOPICS if kind == "brief" else STORY_TOPICS
    covered = covered_topics(kind, messages)
    asked = {
        topic
        for topic in topics
        for m in messages
        if m.get("role") == "assistant" and TOPIC_QUESTIONS[topic][lang] in m.get("content", "")
    }
    remaining = [t for t in topics if t not in covered and t not in asked]
    if not remaining:
        return WRAP_UP["brief" if kind == "brief" else "story"][lang], True
    return f"{ack} {TOPIC_QUESTIONS[remaining[0]][lang]}", False


def _turn_instruction(lang: str) -> str:
    return (
        f"Reply only in {LANG_NAMES[lang]}. "
        "Start by reflecting one concrete detail from latest_user_message in a few words "
        "(a tool, task, team, goal or number they mentioned). "
        "Then ask ONE follow-up that either digs into that detail or covers the most important "
        "item in topics_still_missing. Never ask about something already answered in the "
        "conversation or current_draft, and never repeat an earlier question. Update the draft."
    )


async def next_turn(
    *,
    kind: str,
    messages: list[dict[str, str]],
    draft: dict[str, Any],
    lang: str = "en",
) -> tuple[str, dict[str, Any], bool]:
    lang = normalize_lang(lang)
    users = _user_texts(messages)
    turns = len(users)
    soft_limit = 8 if kind == "brief" else 5
    hard_limit = 10 if kind == "brief" else 8
    wrap = WRAP_UP["brief" if kind == "brief" else "story"][lang]

    system = (
        _load_prompt("interviewer_brief.md" if kind == "brief" else "interviewer_story.md")
        or "Ask one short clarifying question. Return JSON {assistant_text, done, draft}."
    )

    topics = BRIEF_TOPICS if kind == "brief" else STORY_TOPICS
    still_missing = [t for t in topics if t not in covered_topics(kind, messages)]
    if kind == "brief":
        still_missing = _critical_missing(draft or EMPTY_BRIEF_DRAFT) + still_missing

    try:
        result = await chat_json(
            system=system,
            user=json_dumps(
                {
                    "messages": messages,
                    "latest_user_message": users[-1] if users else "",
                    "current_draft": draft or EMPTY_BRIEF_DRAFT,
                    "topics_still_missing": still_missing,
                    "kind": kind,
                    "user_turns": turns,
                    "reply_language": LANG_NAMES[lang],
                    "instruction": _turn_instruction(lang),
                }
            ),
            temperature=0.4,
        )
    except LLMError:
        text, done = contextual_fallback(kind, messages, lang)
        return text, draft or dict(EMPTY_BRIEF_DRAFT), done

    fallback_text, _ = contextual_fallback(kind, messages, lang)
    text = str(result.get("assistant_text") or fallback_text).strip()
    update = result.get("draft") if isinstance(result.get("draft"), dict) else None
    merged = _merge_draft(draft, update) if kind == "brief" else {**(draft or {}), **(update or {})}
    done = bool(result.get("done"))
    if turns >= hard_limit:
        done = True
    elif turns >= soft_limit and (kind != "brief" or not _critical_missing(merged)):
        done = True

    if done and kind == "brief":
        gaps = _critical_missing(merged)
        if gaps and turns < hard_limit:
            return ALMOST_THERE[lang].format(gap=gaps[0]), merged, False
        text = wrap
    elif done:
        text = wrap
    return text, merged, done


def json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)
