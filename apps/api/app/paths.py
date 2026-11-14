"""Resolve repo paths so Docker and local layouts both work."""

from __future__ import annotations

from pathlib import Path


def find_repo_root() -> Path:
    """Walk up from this file until we find ``data/`` (seed + ESCO files)."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "data").is_dir() and (
            (parent / "data" / "seed").exists()
            or (parent / "data" / "esco_skills_subset.json").exists()
            or (parent / "data" / "esco_skills_fallback.json").exists()
        ):
            return parent
    # apps/api/app -> parents[3] is monorepo root in the default layout
    return here.parents[3]
