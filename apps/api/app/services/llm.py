from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import get_settings


class LLMError(Exception):
    pass


def _chat_url_and_headers() -> tuple[str, dict[str, str], str]:
    """Returns (url, headers, model_or_deployment_name_for_payload)."""
    settings = get_settings()
    if settings.llm_provider == "azure":
        if not settings.azure_openai_api_key or not settings.azure_openai_endpoint:
            raise LLMError("Azure OpenAI not configured")
        base = settings.azure_openai_endpoint.rstrip("/")
        deployment = settings.azure_chat_deployment
        url = (
            f"{base}/openai/deployments/{deployment}/chat/completions"
            f"?api-version={settings.azure_openai_api_version}"
        )
        headers = {"api-key": settings.azure_openai_api_key, "Content-Type": "application/json"}
        return url, headers, deployment

    if not settings.llm_api_key:
        raise LLMError("LLM_API_KEY not configured")
    return (
        "https://api.openai.com/v1/chat/completions",
        {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        },
        settings.llm_model,
    )


async def chat_json(
    *,
    system: str,
    user: str,
    timeout: float = 20.0,
    temperature: float = 0.1,
) -> dict[str, Any]:
    """Provider adapter with one retry; supports OpenAI and Azure OpenAI."""
    url, headers, model = _chat_url_and_headers()
    payload: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
        "temperature": temperature,
    }
    # Azure deployment is in the URL; OpenAI wants model in body.
    settings = get_settings()
    if settings.llm_provider != "azure":
        payload["model"] = model

    last_err: Exception | None = None
    for _ in range(2):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                content = res.json()["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as exc:  # noqa: BLE001
            last_err = exc
    raise LLMError(str(last_err) if last_err else "LLM failed")
