from __future__ import annotations

import re
from typing import Any

from app.services.embeddings import embed_texts_sync, skill_index
from app.services.llm import LLMError, chat_json


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def quote_is_substring(quote: str, transcript: str) -> bool:
    return _norm(quote) in _norm(transcript)


def chunk_transcript(transcript: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", transcript.strip())
    chunks: list[str] = []
    buf: list[str] = []
    for part in parts:
        if not part:
            continue
        buf.append(part)
        if len(buf) >= 2:
            chunks.append(" ".join(buf))
            buf = []
    if buf:
        chunks.append(" ".join(buf))
    return chunks or ([transcript] if transcript.strip() else [])


async def map_skills_from_transcript(
    transcript: str,
    *,
    kind: str = "story",
    api_key: str = "",
    embed_model: str = "",
) -> list[dict[str, Any]]:
    """Retrieve candidate ESCO skills, ask LLM to pick with verbatim quotes, validate."""
    chunks = chunk_transcript(transcript)
    if not chunks or not skill_index.ready:
        return []

    vectors = embed_texts_sync(chunks, api_key=api_key, model=embed_model)
    candidate_ids: dict[int, str] = {}
    for vec in vectors:
        for sid, _score in skill_index.top_k(vec, k=15):
            candidate_ids[sid] = skill_index.label(sid)

    candidates = [{"skill_id": sid, "label": label} for sid, label in candidate_ids.items()]
    prompt_name = "extract_story.md" if kind == "story" else "extract_brief.md"
    from pathlib import Path

    prompt_path = Path(__file__).resolve().parents[1] / "prompts" / prompt_name
    system = prompt_path.read_text(encoding="utf-8") if prompt_path.exists() else (
        "Select skills from CANDIDATES with evidence_quote exact substrings of TRANSCRIPT. Return JSON."
    )

    try:
        result = await chat_json(
            system=system,
            user=f"CANDIDATES={candidates}\nTRANSCRIPT={transcript}",
        )
    except LLMError:
        return []

    selected: list[dict[str, Any]] = []
    for item in result.get("skills") or []:
        sid = item.get("skill_id")
        quote = str(item.get("evidence_quote") or item.get("source_quote") or "")
        if sid not in candidate_ids:
            continue
        # Quotes preferred; if missing on brief labels, still keep mapped skill_id
        if quote and not quote_is_substring(quote, transcript):
            continue
        if not quote and kind != "brief":
            continue
        row: dict[str, Any] = {
            "skill_id": int(sid),
            "label": candidate_ids[int(sid)],
            "evidence_quote": quote,
        }
        if kind == "brief" and item.get("importance") in {"must", "learnable", "nice"}:
            row["importance"] = item["importance"]
            row["source_quote"] = quote or None
        selected.append(row)
    return selected
