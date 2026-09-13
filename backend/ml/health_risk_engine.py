"""
Health Risk Engine — mortality & hospitalization risk estimation.

IMPORTANT METHODOLOGY NOTE (must be surfaced in the UI, not hidden):
India does not have a public, granular (district/day-level) heat-mortality
dataset available for training a supervised ML model in this prototype.
Rather than fabricate synthetic training labels and present a model as if
it learned real mortality patterns, this engine instead applies a
transparent, documented dose-response function anchored to published,
peer-reviewed relative-risk (RR) estimates for Indian cities:

  Source: "Building Resilience to Climate Change: Pilot Evaluation of the
  Impact of India's First Heat Action Plan on All-Cause Mortality"
  (Ahmedabad, Gujarat; PMC6236972). Using distributed-lag nonlinear
  models on real mortality registry data, the study reports:
    - Pre-Heat-Action-Plan relative risk of death at 47C (lag 0): RR = 2.34
      (95% CI 1.98-2.76)
    - Post-HAP (with cooling centres, public warnings, etc.) RR at the
      same temperature: RR = 1.25
    - Documented mortality threshold effect above ~40C (Tmax)

  Source: de Bont et al., multi-city Indian mortality study (2008-2019,
  10 cities) — establishes that heatwave-attributable mortality risk is
  materially larger for multi-day (5-day) heatwaves than single-day
  events, consistent with physiological accumulation of heat stress.

This prototype fits a smooth exponential relative-risk curve through
those two REAL anchor points (RR=1.0 baseline below the 40C threshold,
RR=2.34 at 47C) to estimate relative mortality/hospitalization risk at
any given Human Thermal Stress Score, then scales it by real local
vulnerability (from services/vulnerability_engine.py) and heatwave
duration. It reports a RELATIVE RISK CATEGORY, not an absolute death
count — absolute counts would require real local baseline mortality
rates this prototype does not have access to.

The UI must show: "AI-ASSISTED RISK ESTIMATE — anchored to published
Indian heat-mortality studies, not a clinically validated predictive
model."
"""
from __future__ import annotations
import math
from dataclasses import dataclass

# Real anchor points from Azhar et al. (Ahmedabad HAP evaluation)
ANCHOR_TEMP_BASELINE_C = 40.0   # documented mortality threshold effect
ANCHOR_TEMP_HIGH_C = 47.0
ANCHOR_RR_BASELINE = 1.0
ANCHOR_RR_HIGH_PRE_HAP = 2.34   # pre-intervention relative risk (worst case, no HAP)
ANCHOR_RR_HIGH_POST_HAP = 1.25  # post-intervention relative risk (with cooling/warnings)

# Solve k such that RR(47) = 2.34 given RR(T) = 1 + (RR_high-1) * exp(k*(T-40)) ... use simpler
# exponential fit: RR(T) = exp(b * max(0, T - baseline)), solved so RR(47)=2.34
_B_PRE_HAP = math.log(ANCHOR_RR_HIGH_PRE_HAP) / (ANCHOR_TEMP_HIGH_C - ANCHOR_TEMP_BASELINE_C)
_B_POST_HAP = math.log(ANCHOR_RR_HIGH_POST_HAP) / (ANCHOR_TEMP_HIGH_C - ANCHOR_TEMP_BASELINE_C)


@dataclass
class HealthRiskResult:
    mortality_relative_risk: float
    mortality_risk_category: str
    hospitalization_relative_risk: float
    hospitalization_risk_category: str
    explanation: dict
    methodology_note: str


def _rr_category(rr: float) -> str:
    if rr < 1.15:
        return "LOW"
    elif rr < 1.5:
        return "MODERATE"
    elif rr < 2.0:
        return "HIGH"
    else:
        return "SEVERE"


def estimate_health_risk(
    temp_c: float,
    heatwave_active: bool,
    heatwave_duration_days: float,
    vulnerability_score: float,
    thermal_stress_score: float,
    has_heat_action_plan: bool = True,
) -> HealthRiskResult:
    """
    temp_c: current/forecast daily max temperature
    has_heat_action_plan: whether the location has active heat-action-plan
      style interventions (cooling centres, alerts) — Delhi and most major
      Indian metros do; this shifts the anchor curve toward the real
      post-HAP figures rather than the worse pre-HAP baseline.
    """
    b = _B_POST_HAP if has_heat_action_plan else _B_PRE_HAP
    excess_temp = max(0.0, temp_c - ANCHOR_TEMP_BASELINE_C)
    base_rr = math.exp(b * excess_temp)

    # Multi-day heatwave amplification: de Bont et al. document materially
    # larger per-day risk for sustained (5-day) events vs single-day.
    # Documented prototype assumption: +4%/day beyond day 1, capped at +25%.
    duration_multiplier = 1.0
    if heatwave_active and heatwave_duration_days > 1:
        duration_multiplier = 1 + min(0.25, 0.04 * (heatwave_duration_days - 1))

    # Vulnerability modulates individual/population-level exposure risk.
    # Documented assumption: vulnerability score of 100 doubles relative risk,
    # 0 leaves it unchanged (linear interpolation).
    vulnerability_multiplier = 1 + (vulnerability_score / 100.0)

    mortality_rr = base_rr * duration_multiplier * vulnerability_multiplier
    # Hospitalization risk is documented in the literature as elevated at
    # lower thresholds than mortality (illness precedes death); modelled
    # here as a fraction of the mortality curve's excess risk, scaled up
    # since hospitalizations are more frequent than deaths.
    hosp_rr = 1 + (mortality_rr - 1) * 1.6

    return HealthRiskResult(
        mortality_relative_risk=round(mortality_rr, 2),
        mortality_risk_category=_rr_category(mortality_rr),
        hospitalization_relative_risk=round(hosp_rr, 2),
        hospitalization_risk_category=_rr_category(hosp_rr),
        explanation={
            "base_temperature_relative_risk": round(base_rr, 2),
            "heatwave_duration_multiplier": round(duration_multiplier, 2),
            "vulnerability_multiplier": round(vulnerability_multiplier, 2),
            "heat_action_plan_assumed_active": has_heat_action_plan,
            "temperature_input_c": temp_c,
            "thermal_stress_score_input": thermal_stress_score,
        },
        methodology_note=(
            "Relative risk curve anchored to real published relative-risk figures from the "
            "Ahmedabad Heat Action Plan evaluation study (PMC6236972): RR=2.34 at 47C pre-intervention, "
            "RR=1.25 at 47C post-intervention, threshold effect above 40C. This is an AI-ASSISTED "
            "RELATIVE RISK ESTIMATE anchored to peer-reviewed Indian heat-mortality research, not a "
            "clinically validated predictive model and not an absolute death-count forecast."
        ),
    )
