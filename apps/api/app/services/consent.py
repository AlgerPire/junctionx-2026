"""Consent purposes and privacy notice (plain language)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import ConsentRecord

CONSENT_PURPOSES = (
    "skill_story",
    "matching_suggestions",
    "event_participation",
    "audit_logging",
)

NOTICE = {
    "en": {
        "title": "Privacy notice (pilot)",
        "summary": (
            "Skills First! helps you explain your skills and meet companies at Espoo events. "
            "Using this service never affects your access to public employment services or benefits."
        ),
        "points": [
            "We store skills you approve, with quotes from your own words.",
            "Companies see an alias and approved skills only — not your name — until they accept an approach.",
            "Audio is never stored. Transcripts are deleted when you approve your story, or within 24 hours.",
            "You can withdraw consent and delete your data at any time from Transparency.",
            "Matching never uses nationality, age, gender, school, photo or address.",
        ],
        "ai_notice": (
            "You are interacting with AI assistance. No automated hiring decision is made about you. "
            "Humans decide whom to meet."
        ),
    },
    "fi": {
        "title": "Tietosuojailmoitus (pilotti)",
        "summary": (
            "Skills First! auttaa sinua kertomaan osaamisestasi ja tapaamaan yrityksiä Espoon tapahtumissa. "
            "Palvelun käyttö ei vaikuta oikeuteesi julkisiin työllisyyspalveluihin tai etuuksiin."
        ),
        "points": [
            "Tallennamme hyväksymäsi taidot ja sitaatit omista sanoistasi.",
            "Yritykset näkevät aliaksen ja hyväksytyt taidot — ei nimeäsi — ennen kuin he hyväksyvät yhteydenoton.",
            "Ääntä ei tallenneta. Litteraatit poistetaan, kun hyväksyt tarinasi, tai viimeistään 24 tunnissa.",
            "Voit peruuttaa suostumuksen ja poistaa tietosi milloin tahansa Läpinäkyvyys-sivulta.",
            "Sovitus ei käytä kansalaisuutta, ikää, sukupuolta, koulua, kuvaa tai osoitetta.",
        ],
        "ai_notice": (
            "Käytät tekoälyavustusta. Sinusta ei tehdä automaattista rekrytointipäätöstä. "
            "Ihmiset päättävät kenet tavataan."
        ),
    },
    "sv": {
        "title": "Integritetsmeddelande (pilot)",
        "summary": (
            "Skills First! hjälper dig beskriva dina färdigheter och träffa företag på Esbo-evenemang. "
            "Att använda tjänsten påverkar aldrig din tillgång till offentliga arbetsmarknadstjänster eller förmåner."
        ),
        "points": [
            "Vi lagrar färdigheter du godkänner, med citat från dina egna ord.",
            "Företag ser ett alias och godkända färdigheter — inte ditt namn — förrän de accepterar en kontakt.",
            "Ljud lagras aldrig. Transkript raderas när du godkänner din berättelse, eller inom 24 timmar.",
            "Du kan återkalla samtycke och radera dina data när som helst under Transparens.",
            "Matchning använder aldrig nationalitet, ålder, kön, skola, foto eller adress.",
        ],
        "ai_notice": (
            "Du interagerar med AI-stöd. Inget automatiskt rekryteringsbeslut fattas om dig. "
            "Människor bestämmer vem som träffas."
        ),
    },
}


def privacy_notice(locale: str = "en") -> dict:
    lang = locale if locale in NOTICE else "en"
    settings = get_settings()
    body = NOTICE[lang]
    return {
        "version": settings.privacy_notice_version,
        "locale": lang,
        "purposes": list(CONSENT_PURPOSES),
        **body,
    }


def active_consents(db: Session, user_id: int) -> dict[str, bool]:
    version = get_settings().privacy_notice_version
    rows = db.scalars(
        select(ConsentRecord).where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.version == version,
            ConsentRecord.withdrawn_at.is_(None),
        )
    ).all()
    granted = {r.purpose for r in rows}
    return {p: p in granted for p in CONSENT_PURPOSES}


def has_required_consent(db: Session, user_id: int) -> bool:
    status = active_consents(db, user_id)
    return all(status.values())
