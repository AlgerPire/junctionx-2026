import asyncio

from app.config import get_settings
from app.services.llm import chat_json


async def main() -> None:
    get_settings.cache_clear()
    s = get_settings()
    print("provider", s.llm_provider)
    print("endpoint", s.azure_openai_endpoint)
    print("chat", s.azure_chat_deployment)
    print("stt", s.stt_provider, s.azure_speech_region)
    print("keys", bool(s.azure_openai_api_key), bool(s.azure_speech_key))
    result = await chat_json(
        system='Return JSON only: {"ok": true}',
        user="ping",
    )
    print("llm", result)


if __name__ == "__main__":
    asyncio.run(main())
