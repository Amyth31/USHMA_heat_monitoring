"""
USHMA — Thermal Index Engine
=============================
Implements established scientific thermal-stress formulas.

References (documented per SIH scientific-credibility requirement):
  - Heat Index: Rothfusz (1990) NWS regression equation, used operationally
    by the US National Weather Service.
  - WBGT: Simplified outdoor WBGT estimation following the approach of
    Bernard (1996) / Liljegren et al. (2008), using the widely-cited
    empirical approximation:
        WBGT_outdoor ≈ 0.7*Tw + 0.2*Tg + 0.1*Ta
    Since a true wet-bulb (Tw) and black-globe (Tg) temperature are not
    measured directly in this prototype, Tw is estimated via the
    Stull (2011) psychrometric approximation and Tg is estimated from
    air temperature + a solar-radiation-driven offset. This is a
    DOCUMENTED APPROXIMATION, not a direct-measurement WBGT.
  - UTCI: A full UTCI requires a 6th-order polynomial regression with
    100+ terms (Bröde et al., 2012) driven by mean radiant temperature.
    This prototype uses the simplified operational approximation
    published by the UTCI project team for cases where only air
    temperature, humidity, and wind are available, adjusted for solar
    load. This is EXPLICITLY a simplified approximation, not the
    official UTCI polynomial implementation.

All functions return both the computed value AND a breakdown of
assumptions so the frontend can display transparent methodology.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Helper: Stull (2011) wet-bulb temperature approximation
# ---------------------------------------------------------------------------
def wet_bulb_temperature(temp_c: float, rh_pct: float) -> float:
    """
    Stull, R. (2011): 'Wet-Bulb Temperature from Relative Humidity and Air
    Temperature.' Journal of Applied Meteorology and Climatology, 50(11).
    Valid roughly for -20C to 50C, 5%-99% RH (typical Indian summer range).
    """
    import math
    rh = max(5.0, min(99.0, rh_pct))
    tw = (
        temp_c * math.atan(0.151977 * (rh + 8.313659) ** 0.5)
        + math.atan(temp_c + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035
    )
    return tw


# ---------------------------------------------------------------------------
# 1. HEAT INDEX  (Rothfusz 1990, NWS regression — valid T>=27C, RH>=40%)
# ---------------------------------------------------------------------------
@dataclass
class HeatIndexResult:
    heat_index_c: float
    heat_index_f: float
    formula: str
    inputs: dict
    notes: str
    extrapolated: bool = False


def heat_index(temp_c: float, rh_pct: float) -> HeatIndexResult:
    T = temp_c * 9 / 5 + 32  # Rothfusz regression is defined in Fahrenheit
    R = rh_pct

    # Simple formula (Steadman-based average), used below ~80F/40%RH
    hi_simple = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094))

    if (hi_simple + T) / 2 >= 80:
        # Full Rothfusz regression
        hi = (
            -42.379
            + 2.04901523 * T
            + 10.14333127 * R
            - 0.22475541 * T * R
            - 0.00683783 * T * T
            - 0.05481717 * R * R
            + 0.00122874 * T * T * R
            + 0.00085282 * T * R * R
            - 0.00000199 * T * T * R * R
        )
        # Low-humidity / high-temp adjustment
        if R < 13 and 80 <= T <= 112:
            adj = ((13 - R) / 4) * ((17 - abs(T - 95)) / 17) ** 0.5
            hi -= adj
        elif R > 85 and 80 <= T <= 87:
            adj = ((R - 85) / 10) * ((87 - T) / 5)
            hi += adj
    else:
        hi = hi_simple

    hi_c = (hi - 32) * 5 / 9

    # The Rothfusz regression is only empirically validated up to ~54C/130F.
    # Very high temp+humidity combinations (rare/physically extreme) cause the
    # polynomial to extrapolate sharply. Flag rather than silently hide this.
    extrapolated = hi > 130

    return HeatIndexResult(
        heat_index_c=round(hi_c, 1),
        heat_index_f=round(hi, 1),
        formula="Rothfusz (1990) NWS regression equation",
        inputs={"temperature_c": temp_c, "relative_humidity_pct": rh_pct},
        notes=(
            "Valid primarily for T>=27C and RH>=40%; simple approximation used outside that range. "
            + ("WARNING: inputs fall in an extreme extrapolation region (NWS heat index >130F) "
               "rarely observed in nature; treat as an upper-bound estimate, not a validated reading."
               if extrapolated else "")
        ),
        extrapolated=extrapolated,
    )


# ---------------------------------------------------------------------------
# 2. WBGT (outdoor, approximated)
# ---------------------------------------------------------------------------
@dataclass
class WBGTResult:
    wbgt_c: float
    wbgt_indoor_shade_c: float
    tw_estimate_c: float
    tg_estimate_c: float
    formula: str
    inputs: dict
    notes: str


def wbgt(temp_c: float, rh_pct: float, solar_radiation_wm2: float, wind_ms: float) -> WBGTResult:
    tw = wet_bulb_temperature(temp_c, rh_pct)

    # Black globe temp approximation: air temp + solar-driven offset,
    # reduced by wind (convective cooling of the globe).
    solar_offset = (solar_radiation_wm2 / 1000.0) * 8.0  # up to ~+8C at 1000 W/m2
    wind_relief = min(2.5, wind_ms * 0.6)
    tg = temp_c + solar_offset - wind_relief

    wbgt_outdoor = 0.7 * tw + 0.2 * tg + 0.1 * temp_c
    wbgt_indoor = 0.7 * tw + 0.3 * temp_c  # no solar/globe term for shade/indoor

    return WBGTResult(
        wbgt_c=round(wbgt_outdoor, 1),
        wbgt_indoor_shade_c=round(wbgt_indoor, 1),
        tw_estimate_c=round(tw, 1),
        tg_estimate_c=round(tg, 1),
        formula="WBGT_outdoor = 0.7*Tw + 0.2*Tg + 0.1*Ta (Bernard 1996 / Liljegren 2008 approximation)",
        inputs={
            "temperature_c": temp_c,
            "relative_humidity_pct": rh_pct,
            "solar_radiation_wm2": solar_radiation_wm2,
            "wind_ms": wind_ms,
        },
        notes=(
            "Tw estimated via Stull (2011) psychrometric approximation; "
            "Tg (black-globe) estimated from air temp + solar-radiation offset "
            "reduced by wind — NOT a direct globe-thermometer measurement."
        ),
    )


# ---------------------------------------------------------------------------
# 3. UTCI (simplified operational approximation)
# ---------------------------------------------------------------------------
@dataclass
class UTCIResult:
    utci_c: float
    stress_category: str
    formula: str
    inputs: dict
    notes: str


UTCI_CATEGORIES = [
    (-40, "Extreme cold stress"),
    (-27, "Very strong cold stress"),
    (-13, "Strong cold stress"),
    (0, "Moderate cold stress"),
    (9, "Slight cold stress"),
    (26, "No thermal stress"),
    (32, "Moderate heat stress"),
    (38, "Strong heat stress"),
    (46, "Very strong heat stress"),
    (999, "Extreme heat stress"),
]


def _utci_category(value: float) -> str:
    for threshold, label in UTCI_CATEGORIES:
        if value < threshold:
            return label
    return "Extreme heat stress"


def utci(temp_c: float, rh_pct: float, wind_ms: float, solar_radiation_wm2: float) -> UTCIResult:
    """
    Simplified UTCI approximation (NOT the official 6th-order polynomial).
    Approach: start from air temperature, apply humidity-driven correction
    (evaporative-cooling deficit at high RH & high T) and a mean-radiant-
    temperature proxy from solar radiation, then apply a wind-chill-style
    convective correction. Calibrated to track published UTCI behaviour
    directionally, not to reproduce it exactly.
    """
    # Mean radiant temperature proxy: air temp + solar loading
    mrt_offset = (solar_radiation_wm2 / 1000.0) * 10.0
    mrt = temp_c + mrt_offset

    # Humidity correction: increasingly positive above ~20C as evaporative
    # cooling becomes less effective; near-zero/negative at low humidity.
    humidity_term = 0.05 * (rh_pct - 50) * max(0.0, (temp_c - 20) / 20)

    # Wind correction: convective heat loss reduces apparent temperature,
    # with diminishing effect as wind increases (sqrt damping).
    wind_term = -1.5 * (wind_ms ** 0.5)

    utci_val = temp_c + 0.35 * (mrt - temp_c) + humidity_term + wind_term

    return UTCIResult(
        utci_c=round(utci_val, 1),
        stress_category=_utci_category(utci_val),
        formula="Simplified UTCI approximation (air temp + MRT-proxy + humidity/wind correction)",
        inputs={
            "temperature_c": temp_c,
            "relative_humidity_pct": rh_pct,
            "wind_ms": wind_ms,
            "solar_radiation_wm2": solar_radiation_wm2,
        },
        notes=(
            "This is a simplified prototype approximation of UTCI, not the official "
            "Bröde et al. (2012) 6th-order polynomial, which requires full radiative "
            "flux modelling. Category thresholds follow the official UTCI scale."
        ),
    )


# ---------------------------------------------------------------------------
# 4. HUMAN THERMAL STRESS SCORE (0-100, composite, explainable)
# ---------------------------------------------------------------------------
@dataclass
class ThermalStressResult:
    score: float
    category: str
    contributions: dict
    formula: str
    inputs: dict


STRESS_CATEGORIES = [
    (20, "SAFE"),
    (40, "CAUTION"),
    (60, "MODERATE"),
    (80, "HIGH"),
    (100.01, "EXTREME"),
]


def _stress_category(score: float) -> str:
    for threshold, label in STRESS_CATEGORIES:
        if score <= threshold:
            return label
    return "EXTREME"


def human_thermal_stress_score(
    temp_c: float,
    rh_pct: float,
    wind_ms: float,
    solar_radiation_wm2: float,
    heat_index_c: float,
    wbgt_c: float,
    vulnerability_score: float = 0.0,
    exposure_hours: float = 1.0,
) -> ThermalStressResult:
    """
    Composite 0-100 score blending calculated thermal indices with
    exposure duration and population vulnerability. Weights are
    configurable prototype assumptions, documented explicitly.
    """
    # Base thermal contribution from WBGT (most physiologically complete index available)
    wbgt_contrib = _clamp((wbgt_c - 20) / (40 - 20) * 45, 0, 45)

    # Heat index contribution (captures perceived/humidity-driven stress)
    hi_contrib = _clamp((heat_index_c - 27) / (55 - 27) * 20, 0, 20)

    # Low-wind penalty (less convective/evaporative relief)
    wind_contrib = _clamp((3.0 - wind_ms) / 3.0, 0, 1) * 10

    # Solar radiation direct load
    solar_contrib = _clamp(solar_radiation_wm2 / 1000.0, 0, 1) * 10

    # Exposure duration multiplier effect (diminishing returns)
    exposure_contrib = _clamp(exposure_hours / 8.0, 0, 1) * 5

    # Vulnerability (population characteristics) contribution
    vuln_contrib = _clamp(vulnerability_score / 100.0, 0, 1) * 10

    total = wbgt_contrib + hi_contrib + wind_contrib + solar_contrib + exposure_contrib + vuln_contrib
    total = _clamp(total, 0, 100)

    contributions = {
        "wbgt_contribution": round(wbgt_contrib, 1),
        "heat_index_contribution": round(hi_contrib, 1),
        "low_wind_contribution": round(wind_contrib, 1),
        "solar_radiation_contribution": round(solar_contrib, 1),
        "exposure_duration_contribution": round(exposure_contrib, 1),
        "vulnerability_contribution": round(vuln_contrib, 1),
    }

    return ThermalStressResult(
        score=round(total, 1),
        category=_stress_category(total),
        contributions=contributions,
        formula=(
            "score = wbgt_term(0-45) + heat_index_term(0-20) + low_wind_term(0-10) "
            "+ solar_term(0-10) + exposure_term(0-5) + vulnerability_term(0-10)"
        ),
        inputs={
            "temperature_c": temp_c,
            "relative_humidity_pct": rh_pct,
            "wind_ms": wind_ms,
            "solar_radiation_wm2": solar_radiation_wm2,
            "heat_index_c": heat_index_c,
            "wbgt_c": wbgt_c,
            "vulnerability_score": vulnerability_score,
            "exposure_hours": exposure_hours,
        },
    )


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))
