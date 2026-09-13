import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.heatwave_engine import classify_day, classify_sequence


def test_imd_severe_heatwave_at_45c_absolute():
    result = classify_day("Delhi", 45.5)
    assert result.status in ("SEVERE", "EXTREME")


def test_imd_extreme_heatwave_at_47c_absolute():
    result = classify_day("Delhi", 47.5)
    assert result.status == "EXTREME"


def test_imd_normal_conditions_not_flagged():
    result = classify_day("Delhi", 38.0)  # close to regional May normal (40C)
    assert result.status in ("NONE", "POTENTIAL")


def test_confirmed_multiday_requires_two_consecutive_severe_days():
    # single severe day should NOT confirm a multi-day heatwave
    single_day = classify_sequence("Delhi", [46.0, 30.0, 30.0])
    assert single_day["confirmed_multiday_heatwave"] is False

    # two consecutive severe days SHOULD confirm it
    two_days = classify_sequence("Delhi", [46.0, 46.5, 30.0])
    assert two_days["confirmed_multiday_heatwave"] is True
    assert two_days["consecutive_severe_days"] == 2


def test_real_may_2024_delhi_event_classified_extreme():
    # Real IMD-verified 29 May 2024 Delhi heatwave peak: 49.1C
    result = classify_day("Delhi", 49.1)
    assert result.status == "EXTREME"
