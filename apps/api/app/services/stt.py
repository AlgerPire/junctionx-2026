from __future__ import annotations

import json

import httpx

from app.config import get_settings


class STTError(Exception):
    pass


# Candidate locales for Auto-detect (must be valid Azure STT locales individually).
_CANDIDATE_LOCALES = ("en-GB", "fi-FI", "sv-SE", "uk-UA")
_FAST_API_VERSION = "2024-11-15"


def _is_auto(lang: str | None) -> bool:
    return not lang or lang.strip().lower() in {"auto", "detect", "und"}


def _locale(lang: str | None) -> str:
    """Resolve a single BCP-47 locale for pinned transcription."""
    if _is_auto(lang):
        return "en-GB"
    cleaned = lang.replace("_", "-").strip()
    if "-" in cleaned:
        return cleaned
    mapping = {"en": "en-GB", "fi": "fi-FI", "sv": "sv-SE", "uk": "uk-UA", "ua": "uk-UA"}
    return mapping.get(cleaned.lower(), "en-GB")


def candidate_locales(lang: str | None) -> list[str]:
    """Locales to send for Auto (LID) vs a single pinned locale."""
    if _is_auto(lang):
        return list(_CANDIDATE_LOCALES)
    return [_locale(lang)]


async def transcribe_audio(
    data: bytes,
    *,
    content_type: str = "audio/webm",
    filename: str = "audio.webm",
    lang: str | None = None,
) -> str:
    settings = get_settings()
    whisper_lang = None if _is_auto(lang) else lang

    if settings.stt_provider == "azure" and settings.azure_speech_key:
        return await _azure_speech(data, content_type=content_type, lang=lang)

    if settings.llm_api_key and settings.llm_provider == "openai":
        return await _openai_whisper(
            data,
            content_type=content_type,
            filename=filename,
            lang=whisper_lang,
            api_key=settings.llm_api_key,
            model=settings.stt_model,
        )

    raise STTError("Speech-to-text unavailable. Type your answer instead.")


async def _azure_speech(data: bytes, *, content_type: str, lang: str | None) -> str:
    """
    Azure short-audio REST `language=` accepts ONE locale only.
    Auto / multi-locale uses Fast Transcription (locales array + LID).
    """
    if _is_auto(lang):
        try:
            return await _azure_fast_transcription(
                data,
                content_type=content_type,
                locales=list(_CANDIDATE_LOCALES),
            )
        except STTError:
            # Fall back to a single safe locale if Fast Transcription is unavailable.
            return await _azure_conversation_stt(
                data,
                content_type=content_type,
                locale="en-GB",
            )
    return await _azure_conversation_stt(
        data,
        content_type=content_type,
        locale=_locale(lang),
    )


def _audio_content_type(content_type: str) -> str:
    ct = (content_type or "").lower()
    if "wav" in ct:
        return "audio/wav; codecs=audio/pcm; samplerate=16000"
    if "webm" in ct:
        return "audio/webm; codecs=opus"
    if "mp4" in ct or "m4a" in ct:
        return "audio/mp4"
    return content_type or "audio/wav; codecs=audio/pcm; samplerate=16000"


async def _azure_conversation_stt(data: bytes, *, content_type: str, locale: str) -> str:
    settings = get_settings()
    region = settings.azure_speech_region
    key = settings.azure_speech_key
    # Single locale only — comma lists return HTTP 400 Invalid language query parameter.
    url = (
        f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/"
        f"cognitiveservices/v1?language={locale}&format=detailed"
    )
    send_type = _audio_content_type(content_type)
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Accept": "application/json",
        "Content-Type": send_type,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, headers=headers, content=data)
        if res.status_code >= 400 and "wav" not in send_type:
            headers["Content-Type"] = "audio/wav; codecs=audio/pcm; samplerate=16000"
            res = await client.post(url, headers=headers, content=data)
        if res.status_code >= 400:
            raise STTError(f"Azure Speech HTTP {res.status_code}: {res.text[:200]}")
        payload = res.json()
        text = (
            payload.get("DisplayText")
            or payload.get("Text")
            or _best_nbest(payload)
            or ""
        )
        status = payload.get("RecognitionStatus")
        if not str(text).strip():
            raise STTError(
                f"No speech recognised ({status or 'empty'}). "
                "Speak a bit longer, or type instead."
            )
        return str(text).strip()


async def _azure_fast_transcription(
    data: bytes,
    *,
    content_type: str,
    locales: list[str],
) -> str:
    """
    Fast Transcription supports multiple locales for language identification.
    Endpoint: /speechtotext/transcriptions:transcribe
    """
    settings = get_settings()
    region = settings.azure_speech_region
    key = settings.azure_speech_key
    url = (
        f"https://{region}.api.cognitive.microsoft.com/speechtotext/"
        f"transcriptions:transcribe?api-version={_FAST_API_VERSION}"
    )
    definition = json.dumps({"locales": locales})
    # Prefer filename that matches payload; client usually sends WAV PCM 16k.
    filename = "audio.wav" if "wav" in (content_type or "").lower() else "audio.bin"
    mime = _audio_content_type(content_type).split(";")[0].strip() or "application/octet-stream"

    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Accept": "application/json",
    }
    files = {
        "audio": (filename, data, mime),
        "definition": (None, definition),
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(url, headers=headers, files=files)
        if res.status_code >= 400:
            raise STTError(f"Azure Speech HTTP {res.status_code}: {res.text[:200]}")
        payload = res.json()
        text = _fast_transcription_text(payload)
        if not text:
            raise STTError(
                "No speech recognised (fast transcription empty). "
                "Speak a bit longer, or type instead."
            )
        return text


def _fast_transcription_text(payload: dict) -> str:
    combined = payload.get("combinedPhrases") or []
    if combined:
        parts = [str(p.get("text") or "").strip() for p in combined]
        joined = " ".join(p for p in parts if p).strip()
        if joined:
            return joined
    phrases = payload.get("phrases") or []
    parts = [str(p.get("text") or "").strip() for p in phrases]
    return " ".join(p for p in parts if p).strip()


def filename_is_wav(content_type: str) -> bool:
    return "wav" in (content_type or "").lower()


def _best_nbest(payload: dict) -> str:
    nbest = payload.get("NBest") or []
    if not nbest:
        return ""
    top = max(nbest, key=lambda x: float(x.get("Confidence") or 0))
    return str(top.get("Display") or top.get("Lexical") or "")


async def _openai_whisper(
    data: bytes,
    *,
    content_type: str,
    filename: str,
    lang: str | None,
    api_key: str,
    model: str,
) -> str:
    files = {
        "file": (filename, data, content_type),
        "model": (None, model),
    }
    if lang:
        files["language"] = (None, lang.split("-")[0])
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files=files,
        )
        res.raise_for_status()
        return str(res.json().get("text", "")).strip()
