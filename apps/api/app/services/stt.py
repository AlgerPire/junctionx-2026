from __future__ import annotations

import httpx

from app.config import get_settings


class STTError(Exception):
    pass


def _locale(lang: str | None) -> str:
    if not lang:
        return "en-GB"
    if "-" in lang or "_" in lang:
        return lang.replace("_", "-")
    mapping = {"en": "en-GB", "fi": "fi-FI", "sv": "sv-SE"}
    return mapping.get(lang.lower(), "en-GB")


async def transcribe_audio(
    data: bytes,
    *,
    content_type: str = "audio/webm",
    filename: str = "audio.webm",
    lang: str | None = None,
) -> str:
    settings = get_settings()
    locale = _locale(lang)

    if settings.stt_provider == "azure" and settings.azure_speech_key:
        return await _azure_speech(data, content_type=content_type, locale=locale)

    if settings.llm_api_key and settings.llm_provider == "openai":
        return await _openai_whisper(
            data,
            content_type=content_type,
            filename=filename,
            lang=lang,
            api_key=settings.llm_api_key,
            model=settings.stt_model,
        )

    raise STTError("Speech-to-text unavailable. Type your answer instead.")


async def _azure_speech(data: bytes, *, content_type: str, locale: str) -> str:
    settings = get_settings()
    region = settings.azure_speech_region
    key = settings.azure_speech_key
    url = (
        f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/"
        f"cognitiveservices/v1?language={locale}&format=detailed"
    )

    # Prefer WAV/PCM content-type when the client converted audio.
    ct = (content_type or "").lower()
    if "wav" in ct or filename_is_wav(content_type):
        send_type = "audio/wav; codecs=audio/pcm; samplerate=16000"
    elif "webm" in ct:
        send_type = "audio/webm; codecs=opus"
    elif "mp4" in ct or "m4a" in ct:
        send_type = "audio/mp4"
    else:
        send_type = content_type or "audio/wav; codecs=audio/pcm; samplerate=16000"

    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Accept": "application/json",
        "Content-Type": send_type,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, headers=headers, content=data)
        if res.status_code >= 400 and "wav" not in send_type:
            # Retry as WAV-labelled binary (some browsers send odd mime)
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
