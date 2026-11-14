from __future__ import annotations

import httpx

from app.config import get_settings


class TTSError(Exception):
    pass


VOICE_BY_LANG = {
    "en": "en-GB-SoniaNeural",
    "en-gb": "en-GB-SoniaNeural",
    "en-us": "en-US-JennyNeural",
    "fi": "fi-FI-SelmaNeural",
    "fi-fi": "fi-FI-SelmaNeural",
    "sv": "sv-SE-SofieNeural",
    "sv-se": "sv-SE-SofieNeural",
}


def pick_voice(lang: str) -> str:
    settings = get_settings()
    if settings.azure_tts_voice:
        return settings.azure_tts_voice
    key = (lang or "en-GB").lower().replace("_", "-")
    if key in VOICE_BY_LANG:
        return VOICE_BY_LANG[key]
    return VOICE_BY_LANG.get(key.split("-")[0], "en-GB-SoniaNeural")


async def synthesize_speech(text: str, lang: str = "en-GB") -> bytes:
    settings = get_settings()
    if not settings.azure_speech_key:
        raise TTSError("Azure Speech not configured")

    voice = pick_voice(lang)
    locale = "-".join(voice.split("-")[:2])
    # Escape XML special chars in spoken text
    safe = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    ssml = f"""<speak version='1.0' xml:lang='{locale}'>
  <voice name='{voice}'>
    <prosody rate='0%' pitch='0%'>
      {safe}
    </prosody>
  </voice>
</speak>"""

    region = settings.azure_speech_region
    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    headers = {
        "Ocp-Apim-Subscription-Key": settings.azure_speech_key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "FirstSkillDemo",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, headers=headers, content=ssml.encode("utf-8"))
        if res.status_code >= 400:
            raise TTSError(f"Azure TTS HTTP {res.status_code}: {res.text[:200]}")
        return res.content
