"""
Weather Service — orchestrates the live weather provider with caching of
the last real observation per location. If DATABASE_URL is set, the
cache lives in the real weather_observations table; otherwise it's a
disk-backed JSON file per location. Either way it's the same real fetched
data, just stored differently.

Design principle (per explicit product requirement): NEVER fabricate
weather data. If the live provider is unreachable:
  1. Serve the last successfully-fetched real observation for that
     location, clearly marked "STALE_CACHE" with its real fetch timestamp.
  2. If no cached observation exists yet, return an explicit
     "UNAVAILABLE" status rather than inventing numbers.
"""
from __future__ import annotations
import json
import time
from pathlib import Path
from typing import Optional

from weather.providers.live_provider import OpenMeteoProvider
from services.location_service import list_locations, get_location
from db import is_db_enabled, get_cursor

BASE = Path(__file__).resolve().parents[2]
CACHE_DIR = BASE / "data" / "processed" / "weather_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

CACHE_MAX_AGE_SECONDS = 3 * 3600  # treat cache as "fresh" for 3 hours


def _provider() -> OpenMeteoProvider:
    locs = {
        l.location_id: {"name": l.name, "lat": l.latitude, "lon": l.longitude}
        for l in list_locations()
    }
    return OpenMeteoProvider(locs)


def _cache_path(location_id: str) -> Path:
    return CACHE_DIR / f"{location_id}.json"


def _read_cache(location_id: str) -> Optional[dict]:
    if is_db_enabled():
        try:
            with get_cursor() as cur:
                cur.execute(
                    """
                    SELECT temperature_c, relative_humidity_pct, wind_speed_ms,
                           solar_radiation_wm2, pressure_hpa, dew_point_c, source,
                           observed_at, fetched_at
                    FROM weather_observations
                    WHERE location_id = %s
                    ORDER BY fetched_at DESC LIMIT 1
                    """,
                    (location_id,),
                )
                row = cur.fetchone()
            if row is None:
                return None
            (temp, rh, wind, solar, pressure, dewpoint, source, observed_at, fetched_at) = row
            return {
                "location_id": location_id, "temperature_c": temp,
                "relative_humidity_pct": rh, "wind_speed_ms": wind,
                "solar_radiation_wm2": solar, "pressure_hpa": pressure,
                "dew_point_c": dewpoint, "source": source,
                "timestamp": observed_at.isoformat(),
                "_cached_at_unix": fetched_at.timestamp(),
            }
        except Exception:
            pass  # fall through to file cache

    p = _cache_path(location_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except Exception:
        return None


def _write_cache(location_id: str, obs_dict: dict):
    if is_db_enabled():
        try:
            with get_cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO weather_observations
                        (location_id, observed_at, temperature_c, relative_humidity_pct,
                         wind_speed_ms, solar_radiation_wm2, pressure_hpa, dew_point_c, source)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (location_id, obs_dict["timestamp"], obs_dict["temperature_c"],
                     obs_dict["relative_humidity_pct"], obs_dict["wind_speed_ms"],
                     obs_dict["solar_radiation_wm2"], obs_dict.get("pressure_hpa"),
                     obs_dict.get("dew_point_c"), obs_dict["source"]),
                )
            return
        except Exception:
            pass  # fall through to file cache

    obs_dict["_cached_at_unix"] = time.time()
    _cache_path(location_id).write_text(json.dumps(obs_dict))


def get_current_weather(location_id: str) -> dict:
    loc = get_location(location_id)
    if loc is None:
        return {"status": "ERROR", "message": f"Unknown location_id '{location_id}'"}

    try:
        obs = _provider().get_current(location_id)
        obs_dict = obs.__dict__.copy()
        obs_dict["status"] = "LIVE"
        _write_cache(location_id, obs_dict)
        return obs_dict
    except Exception as e:
        cached = _read_cache(location_id)
        if cached:
            age = time.time() - cached.get("_cached_at_unix", 0)
            cached["status"] = "STALE_CACHE"
            cached["cache_age_seconds"] = round(age)
            cached["fetch_error"] = str(e)
            return cached
        return {
            "status": "UNAVAILABLE",
            "message": "Live weather provider unreachable and no cached real observation exists for this location.",
            "fetch_error": str(e),
            "location_id": location_id,
        }


def get_forecast(location_id: str, days: int = 5) -> dict:
    loc = get_location(location_id)
    if loc is None:
        return {"status": "ERROR", "message": f"Unknown location_id '{location_id}'"}
    try:
        obs_list = _provider().get_forecast(location_id, days=days)
        return {
            "status": "LIVE",
            "location_id": location_id,
            "forecast": [o.__dict__ for o in obs_list],
        }
    except Exception as e:
        return {
            "status": "UNAVAILABLE",
            "message": "Live forecast provider unreachable.",
            "fetch_error": str(e),
            "location_id": location_id,
        }
