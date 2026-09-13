"""
Heatwave Detection Engine.

Uses IMD's own published operational heatwave criteria as the documented
basis (India Meteorological Department declares a heatwave when departure
from normal max temperature is >=4.5C-6.4C for "heatwave" / >=6.5C for
"severe heatwave", OR absolute max temp >=45C / >=47C respectively, for
at least 2 consecutive days in the plains).

Since this prototype does not have access to IMD's real 1981-2010 normals
per station, it uses a documented regional normal-temperature approximation
(pre-monsoon May climatological normals by broad zone) as a stand-in,
clearly labeled, with the option to plug in real IMD normals later.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List

# Documented approximate May climatological normal max temperatures (C)
# by broad Indian climate zone, sourced from published IMD climate normals
# summaries. This is a coarse regional stand-in, not station-level data.
REGIONAL_MAY_NORMAL_TMAX_C = {
    "north_plains": 40.0,      # Delhi, Punjab, Haryana, UP plains
    "west_arid": 41.5,         # Rajasthan
    "central": 40.5,           # MP, Chhattisgarh
    "peninsular_interior": 37.0,
    "coastal": 34.5,
    "northeast_hills": 30.0,
}

STATE_ZONE_MAP = {
    "Delhi": "north_plains", "Punjab": "north_plains", "Haryana": "north_plains",
    "Uttar Pradesh": "north_plains", "Rajasthan": "west_arid",
    "Madhya Pradesh": "central", "Chhattisgarh": "central",
    "Maharashtra": "peninsular_interior", "Karnataka": "peninsular_interior",
    "Telangana": "peninsular_interior", "Andhra Pradesh": "peninsular_interior",
    "Tamil Nadu": "coastal", "Kerala": "coastal", "Goa": "coastal",
    "Gujarat": "west_arid", "West Bengal": "coastal", "Odisha": "coastal",
    "Bihar": "north_plains", "Jharkhand": "central",
}


@dataclass
class HeatwaveStatus:
    status: str  # "NONE" | "POTENTIAL" | "DEVELOPING" | "SEVERE" | "EXTREME"
    departure_from_normal_c: float
    normal_tmax_c: float
    criterion: str


def classify_day(state: str, tmax_c: float) -> HeatwaveStatus:
    zone = STATE_ZONE_MAP.get(state, "central")
    normal = REGIONAL_MAY_NORMAL_TMAX_C[zone]
    departure = tmax_c - normal

    if tmax_c >= 47 or departure >= 6.5:
        status, criterion = "EXTREME", "IMD severe-heatwave criterion (absolute >=47C or departure >=6.5C)"
    elif tmax_c >= 45 or departure >= 4.5:
        status, criterion = "SEVERE", "IMD heatwave criterion (absolute >=45C or departure >=4.5C)"
    elif departure >= 3.0:
        status, criterion = "DEVELOPING", "Departure >=3.0C from regional May normal (prototype threshold)"
    elif departure >= 1.5:
        status, criterion = "POTENTIAL", "Departure >=1.5C from regional May normal (prototype threshold)"
    else:
        status, criterion = "NONE", "Within normal range"

    return HeatwaveStatus(
        status=status,
        departure_from_normal_c=round(departure, 1),
        normal_tmax_c=normal,
        criterion=criterion,
    )


def classify_sequence(state: str, daily_tmax: List[float]) -> dict:
    """
    IMD requires the heatwave criterion to hold for >=2 consecutive days.
    Returns overall multi-day heatwave status plus per-day breakdown.
    """
    daily = [classify_day(state, t) for t in daily_tmax]
    severities = {"NONE": 0, "POTENTIAL": 1, "DEVELOPING": 2, "SEVERE": 3, "EXTREME": 4}

    # find longest run where status is SEVERE or EXTREME (sustained IMD-criterion heatwave)
    run = 0
    max_run = 0
    for d in daily:
        if severities[d.status] >= 3:
            run += 1
            max_run = max(max_run, run)
        else:
            run = 0

    confirmed = max_run >= 2
    overall_status = "NONE"
    if confirmed:
        overall_status = "SEVERE" if any(d.status == "SEVERE" for d in daily) else "EXTREME"
        if any(d.status == "EXTREME" for d in daily):
            overall_status = "EXTREME"
    else:
        # Report the worst single-day trend even if not yet a confirmed multi-day heatwave
        worst = max(daily, key=lambda d: severities[d.status])
        overall_status = worst.status

    return {
        "overall_status": overall_status,
        "confirmed_multiday_heatwave": confirmed,
        "consecutive_severe_days": max_run,
        "daily_breakdown": [d.__dict__ for d in daily],
        "duration_days": len(daily_tmax),
    }
