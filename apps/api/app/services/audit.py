from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit(
    db: Session,
    *,
    actor_role: str,
    actor_id: str,
    action: str,
    payload: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_role=actor_role,
        actor_id=actor_id,
        action=action,
        payload=payload or {},
    )
    db.add(entry)
    return entry
