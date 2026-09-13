"""
Decision Support Engine — transparent IF/THEN rules mapping thermal
stress, heatwave status, and health risk to concrete public-health and
disaster-management actions. Every recommendation states its trigger and
reasoning (per SIH explainability requirement) rather than being a black
box.

Actions themselves are drawn from real published Heat Action Plan
guidance (NDMA National Guidelines for Preparation of Heat Action Plan;
Delhi Disaster Management Authority HAP 2024-25), not invented.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List


@dataclass
class Recommendation:
    trigger: str
    risk_level: str
    reason: str
    action: str
    category: str  # "public_health" | "infrastructure" | "workforce" | "communication"


def generate_recommendations(
    thermal_stress_score: float,
    thermal_stress_category: str,
    heatwave_status: str,
    mortality_risk_category: str,
    hospitalization_risk_category: str,
    vulnerability_category: str,
) -> List[Recommendation]:
    recs: List[Recommendation] = []

    if thermal_stress_score > 80 and mortality_risk_category in ("HIGH", "SEVERE"):
        recs.append(Recommendation(
            trigger="Thermal Stress > 80 AND Mortality Risk = HIGH/SEVERE",
            risk_level="EXTREME",
            reason=f"Thermal stress score is {thermal_stress_score}/100 ({thermal_stress_category}) with a "
                   f"{mortality_risk_category.lower()} mortality relative-risk estimate.",
            action="Open cooling centres in high-footfall areas and extend operating hours",
            category="infrastructure",
        ))
        recs.append(Recommendation(
            trigger="Thermal Stress > 80 AND Mortality Risk = HIGH/SEVERE",
            risk_level="EXTREME",
            reason="Sustained extreme thermal stress combined with elevated mortality risk warrants immediate public communication.",
            action="Issue public heat-health advisory via SMS/media; advise against outdoor activity 12pm-4pm",
            category="communication",
        ))

    if heatwave_status in ("SEVERE", "EXTREME"):
        recs.append(Recommendation(
            trigger=f"Heatwave status = {heatwave_status} (IMD sustained-heatwave criterion met)",
            risk_level=heatwave_status,
            reason="Multi-day sustained extreme heat meeting IMD's heatwave criteria increases cumulative physiological stress.",
            action="Shift outdoor labour and construction work hours to before 11am / after 5pm",
            category="workforce",
        ))

    if hospitalization_risk_category in ("HIGH", "SEVERE"):
        recs.append(Recommendation(
            trigger=f"Hospitalization relative risk = {hospitalization_risk_category}",
            risk_level=hospitalization_risk_category,
            reason="Elevated hospitalization risk estimate suggests increased heat-illness case load is likely.",
            action="Alert hospitals and primary health centres to prepare heat-illness triage capacity and ORS/IV fluid stock",
            category="public_health",
        ))

    if vulnerability_category in ("HIGH", "SEVERE"):
        recs.append(Recommendation(
            trigger=f"Population vulnerability category = {vulnerability_category}",
            risk_level=vulnerability_category,
            reason="This area's real Census-derived elderly population share, density, and outdoor-worker exposure indicate a highly heat-vulnerable population.",
            action="Target door-to-door outreach and welfare checks for elderly residents and outdoor workers",
            category="public_health",
        ))

    if thermal_stress_category in ("MODERATE", "HIGH", "EXTREME") and not recs:
        recs.append(Recommendation(
            trigger=f"Thermal stress category = {thermal_stress_category}",
            risk_level=thermal_stress_category,
            reason="Rising thermal stress warrants precautionary awareness even without a confirmed multi-day heatwave.",
            action="Issue routine hydration and sun-safety advisory; monitor forecast for escalation",
            category="communication",
        ))

    if not recs:
        recs.append(Recommendation(
            trigger="No elevated risk indicators",
            risk_level="SAFE",
            reason="Thermal stress, heatwave status, and health-risk indicators are all within normal range.",
            action="No action required; continue routine monitoring",
            category="communication",
        ))

    return recs
