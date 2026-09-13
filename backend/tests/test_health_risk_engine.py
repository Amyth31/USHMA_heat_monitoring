import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.health_risk_engine import estimate_health_risk


def test_relative_risk_at_baseline_temperature_near_one():
    # At/below the documented 40C threshold, relative risk should be ~1.0
    result = estimate_health_risk(
        temp_c=38, heatwave_active=False, heatwave_duration_days=1,
        vulnerability_score=0, thermal_stress_score=10,
    )
    assert result.mortality_relative_risk < 1.2


def test_heat_action_plan_reduces_relative_risk():
    # Regression test against the real anchor points from PMC6236972:
    # RR=2.34 pre-HAP vs RR=1.25 post-HAP at 47C
    with_hap = estimate_health_risk(
        temp_c=47, heatwave_active=True, heatwave_duration_days=1,
        vulnerability_score=0, thermal_stress_score=80, has_heat_action_plan=True,
    )
    without_hap = estimate_health_risk(
        temp_c=47, heatwave_active=True, heatwave_duration_days=1,
        vulnerability_score=0, thermal_stress_score=80, has_heat_action_plan=False,
    )
    assert with_hap.mortality_relative_risk < without_hap.mortality_relative_risk


def test_higher_vulnerability_increases_risk():
    low_vuln = estimate_health_risk(
        temp_c=44, heatwave_active=True, heatwave_duration_days=3,
        vulnerability_score=10, thermal_stress_score=70,
    )
    high_vuln = estimate_health_risk(
        temp_c=44, heatwave_active=True, heatwave_duration_days=3,
        vulnerability_score=90, thermal_stress_score=70,
    )
    assert high_vuln.mortality_relative_risk > low_vuln.mortality_relative_risk


def test_longer_heatwave_duration_increases_risk():
    short = estimate_health_risk(
        temp_c=44, heatwave_active=True, heatwave_duration_days=1,
        vulnerability_score=50, thermal_stress_score=75,
    )
    long_ = estimate_health_risk(
        temp_c=44, heatwave_active=True, heatwave_duration_days=5,
        vulnerability_score=50, thermal_stress_score=75,
    )
    assert long_.mortality_relative_risk > short.mortality_relative_risk


def test_hospitalization_risk_exceeds_mortality_risk():
    # Documented assumption: hospitalization is more frequent than death
    result = estimate_health_risk(
        temp_c=45, heatwave_active=True, heatwave_duration_days=3,
        vulnerability_score=60, thermal_stress_score=80,
    )
    assert result.hospitalization_relative_risk >= result.mortality_relative_risk


def test_methodology_note_cites_real_source():
    result = estimate_health_risk(
        temp_c=40, heatwave_active=False, heatwave_duration_days=1,
        vulnerability_score=20, thermal_stress_score=40,
    )
    assert "PMC6236972" in result.methodology_note
    assert "not a clinically validated" in result.methodology_note
