from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Skill
from app.paths import find_repo_root

ROOT = find_repo_root()
FALLBACK_PATH = ROOT / "data" / "esco_skills_fallback.json"
SUBSET_JSON_PATH = ROOT / "data" / "esco_skills_subset.json"
CSV_PATH = ROOT / "data" / "esco_skills_subset.csv"


# Manual relatedness used when provider embeddings are unavailable.
# Keys are lowercase labels; values are related labels with similarity floor.
RELATEDNESS: dict[str, dict[str, float]] = {
    "clinical documentation": {"health data literacy": 0.8, "medical terminology": 0.78, "hospital workflows": 0.75},
    "nursing practice": {"health data literacy": 0.72, "patient care coordination": 0.82, "hospital workflows": 0.8},
    "hospital workflows": {"care pathway mapping": 0.85, "operations planning": 0.72},
    "care pathway mapping": {"hospital workflows": 0.85, "process improvement": 0.74},
    "teaching and facilitation": {"customer success": 0.76, "onboarding facilitation": 0.82, "mentoring": 0.78},
    "hospitality operations": {"operations planning": 0.78, "shift scheduling": 0.8, "customer support": 0.7},
    "backend development": {"rest apis": 0.86, "fastapi": 0.8, "system design basics": 0.74},
    "react": {"frontend development": 0.88, "javascript": 0.82, "html and css": 0.78},
    "cloud security": {"identity and access management": 0.84, "network security basics": 0.8, "secrets management": 0.82},
}


class SkillIndex:
    """In-memory skill embedding matrix for cosine similarity."""

    def __init__(self) -> None:
        self._ids: list[int] = []
        self._id_to_row: dict[int, int] = {}
        self._matrix: np.ndarray | None = None
        self._labels: dict[int, str] = {}
        self._label_to_id: dict[str, int] = {}

    @property
    def ready(self) -> bool:
        return self._matrix is not None and len(self._ids) > 0

    def load_from_db(self, db: Session) -> None:
        skills = db.query(Skill).order_by(Skill.id).all()
        ids: list[int] = []
        rows: list[list[float]] = []
        labels: dict[int, str] = {}
        for skill in skills:
            if not skill.embedding:
                continue
            ids.append(skill.id)
            rows.append([float(x) for x in skill.embedding])
            labels[skill.id] = skill.label
        if not rows:
            self._ids = []
            self._id_to_row = {}
            self._matrix = None
            self._labels = {}
            return
        matrix = np.asarray(rows, dtype=np.float64)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self._matrix = matrix / norms
        self._ids = ids
        self._id_to_row = {sid: i for i, sid in enumerate(ids)}
        self._labels = labels
        self._label_to_id = {label.lower(): sid for sid, label in labels.items()}

    def sim(self, skill_a: int, skill_b: int) -> float:
        if skill_a == skill_b:
            return 1.0
        cosine = 0.0
        if self._matrix is not None:
            ia = self._id_to_row.get(skill_a)
            ib = self._id_to_row.get(skill_b)
            if ia is not None and ib is not None:
                cosine = float(np.dot(self._matrix[ia], self._matrix[ib]))
        related = 0.0
        la = self._labels.get(skill_a, "").lower()
        lb = self._labels.get(skill_b, "").lower()
        related = max(
            RELATEDNESS.get(la, {}).get(lb, 0.0),
            RELATEDNESS.get(lb, {}).get(la, 0.0),
        )
        return max(cosine, related)

    def top_k(self, vector: list[float], k: int = 15) -> list[tuple[int, float]]:
        if self._matrix is None or not vector:
            return []
        v = np.asarray(vector, dtype=np.float64)
        n = np.linalg.norm(v)
        if n == 0:
            return []
        v = v / n
        scores = self._matrix @ v
        k = min(k, len(scores))
        idx = np.argpartition(-scores, k - 1)[:k]
        ranked = sorted(((self._ids[i], float(scores[i])) for i in idx), key=lambda t: -t[1])
        return ranked

    def label(self, skill_id: int) -> str:
        return self._labels.get(skill_id, str(skill_id))


skill_index = SkillIndex()


def deterministic_embedding(text: str, dims: int = 64) -> list[float]:
    """Offline-friendly embedding: hash-derived unit vector (stable, no API needed)."""
    vec = [0.0] * dims
    tokens = [t for t in "".join(c.lower() if c.isalnum() else " " for c in text).split() if t]
    if not tokens:
        tokens = ["empty"]
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        for i in range(dims):
            byte = digest[i % len(digest)]
            sign = 1.0 if byte % 2 == 0 else -1.0
            vec[i] += sign * ((byte / 255.0) + 0.1)
    # Mix in full-text hash for uniqueness
    full = hashlib.sha256(text.lower().encode("utf-8")).digest()
    for i in range(dims):
        vec[i] += (full[i % len(full)] / 255.0) * 0.25
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def load_skill_definitions() -> list[dict]:
    """Prefer multilingual subset JSON, then CSV, then English fallback."""
    if SUBSET_JSON_PATH.exists():
        with SUBSET_JSON_PATH.open(encoding="utf-8") as f:
            data = json.load(f)
        if data:
            return data

    if CSV_PATH.exists():
        import csv

        rows: list[dict] = []
        with CSV_PATH.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                label = (row.get("label") or row.get("preferredLabel") or "").strip()
                if not label:
                    continue
                rows.append(
                    {
                        "label": label,
                        "labels": {"en": label},
                        "description": (row.get("description") or "").strip(),
                        "cluster": (row.get("cluster") or "transversal").strip(),
                        "esco_uri": (row.get("esco_uri") or row.get("conceptUri") or None),
                        "synonyms": [],
                    }
                )
        if rows:
            return rows

    with FALLBACK_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    for item in data:
        item.setdefault("labels", {"en": item["label"]})
        item.setdefault("synonyms", [])
    return data


def resolve_skill_id(db: Session, text: str, lang: str = "en") -> int | None:
    """Map a label or synonym (any supported language) to a skill id."""
    from app.models import SkillSynonym

    needle = text.strip().lower()
    if not needle:
        return None
    for skill in db.query(Skill).all():
        if skill.label.lower() == needle:
            return skill.id
        labels = skill.labels or {}
        for value in labels.values():
            if str(value).lower() == needle:
                return skill.id
    syn = db.scalar(
        select(SkillSynonym).where(
            SkillSynonym.synonym.ilike(text.strip()),
        )
    )
    if syn is not None:
        return syn.skill_id
    # Prefer language-specific synonym match when available
    _ = lang
    return None


def _embedding_request(texts: list[str], api_key: str = "", model: str = "") -> tuple[str, dict, dict] | None:
    """Build provider embedding request, preferring Azure when configured."""
    from app.config import get_settings

    settings = get_settings()
    if settings.llm_provider == "azure" and settings.azure_openai_api_key and settings.azure_openai_endpoint:
        base = settings.azure_openai_endpoint.rstrip("/")
        deployment = settings.azure_embedding_deployment or model or settings.embed_model
        url = (
            f"{base}/openai/deployments/{deployment}/embeddings"
            f"?api-version={settings.azure_openai_api_version}"
        )
        headers = {"api-key": settings.azure_openai_api_key, "Content-Type": "application/json"}
        return url, headers, {"input": texts}

    key = api_key or settings.llm_api_key
    use_model = model or settings.embed_model
    if key and use_model:
        return (
            "https://api.openai.com/v1/embeddings",
            {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            {"model": use_model, "input": texts},
        )
    return None


async def embed_texts(texts: list[str], api_key: str = "", model: str = "") -> list[list[float]]:
    """Provider embeddings when configured; otherwise deterministic local vectors."""
    req = _embedding_request(texts, api_key=api_key, model=model)
    if req:
        url, headers, payload = req
        try:
            import httpx

            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                items = sorted(res.json()["data"], key=lambda d: d["index"])
                return [item["embedding"] for item in items]
        except Exception:
            pass
    return [deterministic_embedding(t) for t in texts]


def embed_texts_sync(texts: list[str], api_key: str = "", model: str = "") -> list[list[float]]:
    req = _embedding_request(texts, api_key=api_key, model=model)
    if req:
        url, headers, payload = req
        try:
            import httpx

            with httpx.Client(timeout=60.0) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                items = sorted(res.json()["data"], key=lambda d: d["index"])
                return [item["embedding"] for item in items]
        except Exception:
            pass
    return [deterministic_embedding(t) for t in texts]
