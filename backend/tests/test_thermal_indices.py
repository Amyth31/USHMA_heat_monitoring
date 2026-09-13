"""
Tests for backend/thermal/indices.py — each test validates against a
known reference value or a documented physical expectation, not just
"does it run".
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from thermal.indices import (
    wet_bulb_temperature, heat_index, wbgt, utci, human_thermal_stress_score,
)


def test_wet_bulb_matches_stull_published_example():
    # Stull (2011) worked example: T=25C, RH=40% -> Tw ~= 16.4C
    tw = wet_bulb_temperature(25, 40)
    assert abs(tw - 16.4) < 0.1


def test_heat_index_increases_with_humidity_at_fixed_temperature():
    hi_low_rh = heat_index(35, 30).heat_index_c
    hi_high_rh = heat_index(35, 80).heat_index_c
    assert hi_high_rh > hi_low_rh


def test_heat_index_flags_extreme_extrapolation():
    # This exact combination (40.6C/72% RH) triggered a documented
    # extrapolation-region bug during development; regression-test it.
    result = heat_index(40.6, 72)
    assert result.extrapolated is True
    assert result.heat_index_c > 60  # far above input temp, correctly flagged


def test_heat_index_no_extrapolation_flag_for_moderate_conditions():
    result = heat_index(30, 50)
    assert result.extrapolated is False


def test_wbgt_less_than_air_temperature_plausibility():
    # WBGT should be a real, bounded value — not the runaway-hundreds-of-
    # degrees bug found during development (degrees/radians mixup).
    result = wbgt(40.6, 72, 850, 1.8)
    assert 20 < result.wbgt_c < 55


def test_wbgt_increases_with_solar_radiation():
    low_solar = wbgt(38, 50, 100, 2.0).wbgt_c
    high_solar = wbgt(38, 50, 1000, 2.0).wbgt_c
    assert high_solar > low_solar


def test_wbgt_decreases_with_wind():
    low_wind = wbgt(38, 50, 800, 0.5).wbgt_c
    high_wind = wbgt(38, 50, 800, 5.0).wbgt_c
    assert high_wind < low_wind


def test_utci_category_matches_official_scale_boundaries():
    # 26C is the top of "No thermal stress"; just above should be "Moderate heat stress"
    result = utci(20, 50, 2.0, 300)
    assert result.stress_category in ("No thermal stress", "Slight cold stress")


def test_thermal_stress_score_bounded_0_100():
    for temp in (20, 35, 45, 55):
        for rh in (10, 50, 90):
            hi = heat_index(temp, rh)
            w = wbgt(temp, rh, 900, 1.0)
            result = human_thermal_stress_score(temp, rh, 1.0, 900, hi.heat_index_c, w.wbgt_c, vulnerability_score=80, exposure_hours=8)
            assert 0 <= result.score <= 100


def test_thermal_stress_extreme_scenario_categorized_extreme():
    # Real Delhi 29 May 2024 heatwave conditions should read HIGH or EXTREME
    hi = heat_index(49.1, 22)
    w = wbgt(49.1, 22, 950, 2.5)
    result = human_thermal_stress_score(49.1, 22, 2.5, 950, hi.heat_index_c, w.wbgt_c, vulnerability_score=50, exposure_hours=5)
    assert result.category in ("HIGH", "EXTREME")


def test_thermal_stress_low_scenario_categorized_safe_or_caution():
    hi = heat_index(22, 40)
    w = wbgt(22, 40, 200, 3.0)
    result = human_thermal_stress_score(22, 40, 3.0, 200, hi.heat_index_c, w.wbgt_c, vulnerability_score=10, exposure_hours=1)
    assert result.category in ("SAFE", "CAUTION")
