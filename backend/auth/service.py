"""Traveler password authentication (JWT) and traveler-owned trip snapshots.

Operator authentication is separate (env-shared password in
``backend/api/routes.py::operator_login``) and intentionally untouched.
"""

import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.database.config import settings
from backend.database.connection import get_db
from backend.models.models import Trip, User

logger = logging.getLogger(__name__)

if settings.TRAVELER_JWT_SECRET == "dev-only-traveler-jwt-secret-change-in-production":
    logger.warning(
        "TRAVELER_JWT_SECRET is not configured; using the development default. "
        "Set TRAVELER_JWT_SECRET in production."
    )

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PASSWORD_MIN_LENGTH = 8
# bcrypt rejects passwords longer than 72 bytes.
_PASSWORD_MAX_BYTES = 72


class AuthError(Exception):
    """Invalid credentials or session (mapped to HTTP 401)."""


class AuthConflict(Exception):
    """Duplicate account (mapped to HTTP 409)."""


class AuthValidation(Exception):
    """Bad auth/trip payload (mapped to HTTP 422)."""


class TripForbidden(Exception):
    """Trip owned by another traveler (mapped to HTTP 403)."""


class TripNotFound(LookupError):
    """Traveler trip missing or not owned (mapped to HTTP 404)."""


# ---------------------------------------------------------------------------
# Passwords (bcrypt; never plaintext, never returned)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _require_valid_email(email: Any) -> str:
    cleaned = str(email or "").strip().lower()
    if not cleaned or len(cleaned) > 255 or not _EMAIL_RE.match(cleaned):
        raise AuthValidation("a valid email address is required")
    return cleaned


def _require_valid_password(password: Any) -> str:
    if not isinstance(password, str) or len(password) < _PASSWORD_MIN_LENGTH:
        raise AuthValidation(
            f"password must be at least {_PASSWORD_MIN_LENGTH} characters"
        )
    if len(password.encode("utf-8")) > _PASSWORD_MAX_BYTES:
        raise AuthValidation(
            f"password must be at most {_PASSWORD_MAX_BYTES} bytes"
        )
    return password


def _require_valid_name(name: Any) -> str:
    cleaned = str(name or "").strip()
    if not cleaned:
        raise AuthValidation("name is required")
    if len(cleaned) > 255:
        raise AuthValidation("name must be at most 255 characters")
    return cleaned


# ---------------------------------------------------------------------------
# JWT sessions (stateless; logout = client discards the token)
# ---------------------------------------------------------------------------

def issue_traveler_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": "traveler",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.TRAVELER_JWT_EXPIRY_DAYS)).timestamp()),
    }
    return jwt.encode(payload, settings.TRAVELER_JWT_SECRET, algorithm="HS256")


def parse_traveler_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.TRAVELER_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("session has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("invalid session") from exc
    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("invalid session")
    return str(user_id)


def _traveler_from_token(db: Session, token: str) -> User:
    user_id = parse_traveler_token(token)
    user = (
        db.query(User)
        .filter(User.id == user_id, User.is_active == True)  # noqa: E712
        .first()
    )
    if not user or user.role not in ("traveler", "admin"):
        raise AuthError("invalid session")
    return user


def get_current_traveler(request: Request, db: Session = Depends(get_db)) -> User:
    """FastAPI dependency: verified traveler from the Authorization header."""
    header = request.headers.get("authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="authentication required")
    try:
        return _traveler_from_token(db, token.strip())
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


def traveler_dict(user: User) -> Dict[str, Any]:
    return {"id": user.id, "email": user.email, "full_name": user.full_name}


# ---------------------------------------------------------------------------
# Signup / login
# ---------------------------------------------------------------------------

def signup_traveler(db: Session, full_name: str, email: str, password: str) -> Dict[str, Any]:
    cleaned_email = _require_valid_email(email)
    cleaned_name = _require_valid_name(full_name)
    cleaned_password = _require_valid_password(password)
    existing = db.query(User).filter(User.email == cleaned_email).first()
    if existing:
        raise AuthConflict("an account with this email already exists")
    user = User(
        id=str(uuid.uuid4()),
        email=cleaned_email,
        full_name=cleaned_name,
        role="traveler",
        is_active=True,
        password_hash=hash_password(cleaned_password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user": traveler_dict(user), "token": issue_traveler_token(user.id)}


def login_traveler(db: Session, email: str, password: str) -> Dict[str, Any]:
    cleaned_email = _require_valid_email(email)
    if not isinstance(password, str) or not password:
        raise AuthError("invalid email or password")
    user = db.query(User).filter(User.email == cleaned_email).first()
    if (
        not user
        or not user.is_active
        or user.role not in ("traveler", "admin")
        or not user.password_hash
        or not verify_password(password, user.password_hash)
    ):
        raise AuthError("invalid email or password")
    return {"user": traveler_dict(user), "token": issue_traveler_token(user.id)}


# ---------------------------------------------------------------------------
# Traveler-owned canonical trip snapshots
# ---------------------------------------------------------------------------

def _snapshot_summary(row: Trip) -> Dict[str, Any]:
    snap = row.canonical_snapshot if isinstance(row.canonical_snapshot, dict) else {}
    dest = snap.get("destination") if isinstance(snap.get("destination"), dict) else {}
    return {
        "trip_id": row.id,
        "title": snap.get("title") or row.title,
        "destination": dest.get("name") or snap.get("destination_name") or "",
        "start_date": snap.get("start_date"),
        "end_date": snap.get("end_date"),
        "formatted_dates": snap.get("formatted_dates"),
        "duration_days": snap.get("duration_days") or row.duration_days,
        "status": snap.get("status") or row.status,
        "updated_at": (
            row.updated_at.isoformat()
            if getattr(row, "updated_at", None)
            else snap.get("updated_at")
        ),
    }


def save_traveler_trip(db: Session, user: User, trip_id: str, snapshot: Any) -> Dict[str, Any]:
    """Create-or-update the traveler's own canonical snapshot (no duplicates)."""
    cleaned_id = str(trip_id or "").strip()
    if not cleaned_id:
        raise AuthValidation("trip_id is required")
    if not isinstance(snapshot, dict):
        raise AuthValidation("trip snapshot must be an object")
    if str(snapshot.get("id") or "").strip() != cleaned_id:
        raise AuthValidation("snapshot id must match the path trip_id")
    existing = db.query(Trip).filter(Trip.id == cleaned_id).first()
    if existing and existing.user_id != user.id:
        raise TripForbidden("trip belongs to another traveler")
    title = str(snapshot.get("title") or "Untitled trip")[:255]
    if existing:
        existing.canonical_snapshot = snapshot
        existing.title = title
        existing.status = str(snapshot.get("status") or existing.status)[:50]
        db.commit()
        db.refresh(existing)
        return {"trip_id": existing.id, "owned": True, "updated": True}
    row = Trip(
        id=cleaned_id,
        user_id=user.id,
        title=title,
        status=str(snapshot.get("status") or "planning")[:50],
        canonical_snapshot=snapshot,
    )
    db.add(row)
    db.commit()
    return {"trip_id": row.id, "owned": True, "updated": False}


def list_traveler_trips(db: Session, user: User) -> List[Dict[str, Any]]:
    rows = (
        db.query(Trip)
        .filter(Trip.user_id == user.id)
        .order_by(Trip.updated_at.desc())
        .all()
    )
    return [_snapshot_summary(row) for row in rows]


def get_traveler_trip(db: Session, user: User, trip_id: str) -> Dict[str, Any]:
    """Full canonical snapshot; 404 unless owned (no existence leak)."""
    cleaned_id = str(trip_id or "").strip()
    row = (
        db.query(Trip)
        .filter(Trip.id == cleaned_id, Trip.user_id == user.id)
        .first()
    )
    if not row or not isinstance(row.canonical_snapshot, dict):
        raise TripNotFound("trip not found")
    return row.canonical_snapshot
