"""Magic-link and session token helpers (stdlib only)."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from app.config import get_settings


def hash_token(raw: str) -> str:
    secret = get_settings().auth_secret.encode("utf-8")
    return hmac.new(secret, raw.encode("utf-8"), hashlib.sha256).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


def utcnow() -> datetime:
    return datetime.now(UTC)


def magic_link_expiry() -> datetime:
    return utcnow() + timedelta(minutes=get_settings().auth_magic_link_minutes)


def session_expiry() -> datetime:
    return utcnow() + timedelta(hours=get_settings().auth_session_hours)
