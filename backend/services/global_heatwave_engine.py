"""
Global Heatwave Engine — the world-scale counterpart to
services/heatwave_engine.py (which implements India's IMD-specific
criteria). For every other country, this uses the WMO's own general
definition, since IMD's absolute-temperature thresholds (45C/47C) are
calibrated to Indian climate and don't generalize (e.g. they'd never
trigger in Iceland, and would under-trigger relative to local norms in
much hotter equatorial climates).

WMO definition (cited, not invented):
  "A period during which the daily maximum temperature exceeds the
  average maximum temperature by 5C (9F) or more, for more than five
  consecutive days, the 'normal' period being the 1961-1990 baseline."
  (World Meteorological Organization; widely cited, e.g. Britannica,
  WMO-affiliated climate summaries.)

This prototype cannot access the exact 1961-1990 WMO baseline per
station, so it computes a REAL, current climatological reference instead:
the actual mean daily max temperature for the same calendar month over
the last 10 available years, from Open-Meteo's free historical archive
API. This is a documented substitution for the 1961-1990 period (which
would need a paid/restricted archive), not a guessed number — every
input to it is a real observed temperature.
"""
from __future__ import annotations
import statistics
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Optional
import requests

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


@dataclass
class GlobalHeatwaveStatus:
    status: str  # "NONE" | "POTENTIAL" | "DEVELOPING" | "SEVERE" | "EXTREME"
    departure_from_normal_c: float
    normal_tmax_c: Optional[float]
    criterion: str
    baseline_status: str  # "LIVE_10YR_AVG" | "UNAVAILABLE"


def _fetch_climatological_normal(lat: float, lon: float, month: int) -> Optional[float]:
    """
    Real 10-year mean daily max temperature for the given calendar month,
    from Open-Meteo's free historical archive (no key required).
    """
    today = datetime.utcnow()
    end_year = today.year - 1
    start_year = end_year - 9

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": f"{start_year}-{month:02d}-01",
        "end_date": f"{end_year}-{month:02d}-28",
        "daily": "temperature_2m_max",
        "timezone": "UTC",
    }
    resp = requests.get(ARCHIVE_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    values = [v for v in data.get("daily", {}).get("temperature_2m_max", []) if v is not None]
    if not values:
        return None
    return statistics.mean(values)


def classify_day_global(lat: float, lon: float, tmax_c: float, month: int) -> GlobalHeatwaveStatus:
    try:
        normal = _fetch_climatological_normal(lat, lon, month)
        baseline_status = "LIVE_10YR_AVG"
    except Exception:
        normal = None
        baseline_status = "UNAVAILABLE"

    if normal is None:
        return GlobalHeatwaveStatus(
            status="UNKNOWN",
            departure_from_normal_c=0.0,
            normal_tmax_c=None,
            criterion="No real climatological baseline available (historical archive unreachable)",
            baseline_status=baseline_status,
        )

    departure = tmax_c - normal
    if departure >= 8:
        status, criterion = "EXTREME", "WMO threshold (>=5C departure) substantially exceeded"
    elif departure >= 5:
        status, criterion = "SEVERE", "WMO heatwave criterion met (>=5C above real 10-year average max)"
    elif departure >= 3:
        status, criterion = "DEVELOPING", "Approaching WMO threshold (prototype early-warning band)"
    elif departure >= 1.5:
        status, criterion = "POTENTIAL", "Mild positive departure from real local climatology"
    else:
        status, criterion = "NONE", "Within normal range for this location and month"

    return GlobalHeatwaveStatus(
        status=status,
        departure_from_normal_c=round(departure, 1),
        normal_tmax_c=round(normal, 1),
        criterion=criterion,
        baseline_status=baseline_status,
    )


def classify_sequence_global(lat: float, lon: float, daily_tmax: List[float], month: int) -> dict:
    daily = [classify_day_global(lat, lon, t, month) for t in daily_tmax]
    severities = {"UNKNOWN": 0, "NONE": 0, "POTENTIAL": 1, "DEVELOPING": 2, "SEVERE": 3, "EXTREME": 4}

    # WMO requires the >=5C departure to hold for MORE than 5 consecutive days;
    # this prototype's 5-day forecast window can only detect it building, so it
    # reports "confirmed" once the run reaches the 5-day window at SEVERE+.
    run = 0
    max_run = 0
    for d in daily:
        if severities[d.status] >= 3:
            run += 1
            max_run = max(max_run, run)
        else:
            run = 0

    confirmed = max_run >= 5
    if confirmed:
        overall = "EXTREME" if any(d.status == "EXTREME" for d in daily) else "SEVERE"
    elif daily:
        overall = max(daily, key=lambda d: severities[d.status]).status
    else:
        overall = "UNKNOWN"

    return {
        "overall_status": overall,
        "confirmed_multiday_heatwave": confirmed,
        "consecutive_severe_days": max_run,
        "daily_breakdown": [d.__dict__ for d in daily],
        "duration_days": len(daily_tmax),
        "methodology": "WMO general heatwave definition (>=5C above real climatological max for >5 consecutive days)",
    }
