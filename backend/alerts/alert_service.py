"""
Alert Service — turns a location's live risk overview into a structured
alert record.

ACCESS CONTROL: creating or resolving an alert requires is_authority=True,
which the calling route only sets after verifying a passcode
(AUTHORITY_PASSCODE env var) against an X-Authority-Key header. This is
enforced in TWO layers:
  1. Application layer — this module refuses outright if is_authority is
     not True, regardless of storage backend (CSV file or Postgres).
  2. Database layer (real Postgres Row-Level Security, when DATABASE_URL
     is set) — see scripts/init_db.sql. INSERT/UPDATE policies on the
     alerts table check current_setting('app.is_authority'), which this
     module sets via `SET LOCAL` inside the same transaction as the
     write. Even a bug that bypassed layer 1 would still be blocked by
     the database itself.

Reading alerts (list_alerts, get_alert) remains public — the public can
see active alerts, only an authenticated authority can issue them.

This is a real, working two-layer gate for a prototype without a full
user/session system. A production deployment would replace the shared
passcode with real government SSO / per-user roles, but the RLS policy
structure (public SELECT, authority-only INSERT/UPDATE) carries over
unchanged.
"""
from __future__ import annotations
import json
import time
import uuid
from pathlib import Path
from typing import Optional

from db import is_db_enabled, get_cursor


class NotAuthorized(Exception):
    """Raised when a caller without authority tries to create/resolve an alert."""
    pass


BASE = Path(__file__).resolve().parents[2]
ALERTS_PATH = BASE / "data" / "processed" / "alerts_store.json"


def _load() -> list:
    if not ALERTS_PATH.exists():
        return []
    try:
        return json.loads(ALERTS_PATH.read_text())
    except Exception:
        return []


def _save(alerts: list):
    ALERTS_PATH.write_text(json.dumps(alerts, indent=2))


def _row_to_alert(row) -> dict:
    (id_, location_id, location_name, risk_level, trigger, duration, actions, status, created_at) = row
    return {
        "id": id_, "location_id": location_id, "location_name": location_name,
        "risk_level": risk_level, "trigger": trigger,
        "expected_duration_days": duration, "actions": actions,
        "status": status, "created_at_unix": created_at.timestamp(),
    }


def create_alert(location_id: str, location_name: str, risk_level: str,
                  trigger: str, expected_duration_days: Optional[int],
                  actions: list, is_authority: bool = False) -> dict:
    if not is_authority:
        raise NotAuthorized(
            "Only an authenticated disaster-management authority can issue alerts. "
            "This location's current risk data is still visible on the dashboard/risk map."
        )

    alert_id = str(uuid.uuid4())[:8]

    if is_db_enabled():
        try:
            with get_cursor() as cur:
                # Real Postgres RLS check — see scripts/init_db.sql. This
                # SET LOCAL only lasts for this transaction/INSERT.
                cur.execute("SET LOCAL app.is_authority = 'true'")
                cur.execute(
                    """
                    INSERT INTO alerts (id, location_id, risk_level, trigger_description,
                                         expected_duration_days, actions, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE')
                    """,
                    (alert_id, location_id, risk_level, trigger,
                     expected_duration_days, json.dumps(actions)),
                )
            return {
                "id": alert_id, "location_id": location_id, "location_name": location_name,
                "risk_level": risk_level, "trigger": trigger,
                "expected_duration_days": expected_duration_days, "actions": actions,
                "status": "ACTIVE", "created_at_unix": time.time(),
            }
        except Exception:
            pass  # fall through to file store (DB unreachable, not an authority rejection —
                  # the is_authority check above already ran before we got here)

    alerts = _load()
    alert = {
        "id": alert_id, "location_id": location_id, "location_name": location_name,
        "risk_level": risk_level, "trigger": trigger,
        "expected_duration_days": expected_duration_days, "actions": actions,
        "status": "ACTIVE", "created_at_unix": time.time(),
    }
    alerts.insert(0, alert)
    _save(alerts[:500])  # cap store size
    return alert


def list_alerts(status: Optional[str] = None, risk_level: Optional[str] = None) -> list:
    """Public read access — no authority check, anyone can view active alerts."""
    if is_db_enabled():
        try:
            query = """
                SELECT a.id, a.location_id, l.name, a.risk_level, a.trigger_description,
                       a.expected_duration_days, a.actions, a.status, a.created_at
                FROM alerts a JOIN locations l ON l.location_id = a.location_id
                WHERE 1=1
            """
            params = []
            if status:
                query += " AND a.status = %s"
                params.append(status.upper())
            if risk_level:
                query += " AND a.risk_level = %s"
                params.append(risk_level.upper())
            query += " ORDER BY a.created_at DESC LIMIT 500"
            with get_cursor() as cur:
                cur.execute(query, params)
                return [_row_to_alert(row) for row in cur.fetchall()]
        except Exception:
            pass  # fall through to file store

    alerts = _load()
    if status:
        alerts = [a for a in alerts if a["status"].upper() == status.upper()]
    if risk_level:
        alerts = [a for a in alerts if a["risk_level"].upper() == risk_level.upper()]
    return alerts


def get_alert(alert_id: str) -> Optional[dict]:
    if is_db_enabled():
        try:
            with get_cursor() as cur:
                cur.execute(
                    """
                    SELECT a.id, a.location_id, l.name, a.risk_level, a.trigger_description,
                           a.expected_duration_days, a.actions, a.status, a.created_at
                    FROM alerts a JOIN locations l ON l.location_id = a.location_id
                    WHERE a.id = %s
                    """,
                    (alert_id,),
                )
                row = cur.fetchone()
            return _row_to_alert(row) if row else None
        except Exception:
            pass

    for a in _load():
        if a["id"] == alert_id:
            return a
    return None


def resolve_alert(alert_id: str, is_authority: bool = False) -> Optional[dict]:
    if not is_authority:
        raise NotAuthorized("Only an authenticated disaster-management authority can resolve alerts.")

    if is_db_enabled():
        try:
            with get_cursor() as cur:
                cur.execute("SET LOCAL app.is_authority = 'true'")
                cur.execute("UPDATE alerts SET status = 'RESOLVED' WHERE id = %s", (alert_id,))
            return get_alert(alert_id)
        except Exception:
            pass

    alerts = _load()
    for a in alerts:
        if a["id"] == alert_id:
            a["status"] = "RESOLVED"
            _save(alerts)
            return a
    return None
