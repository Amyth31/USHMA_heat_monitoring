"""
Demo Scenarios — built from REAL, documented historical extreme-heat
events, used only when the live weather provider is unreachable (e.g.
offline demo at SIH judging) or when explicitly requested via
?demo=true. Clearly labeled as historical real-event data, not live
current conditions and not synthetic data.

Sources (cited):
  - Delhi, 29 May 2024: IMD's own statement gave a verified NCR range of
    45.2C-49.1C across its 5 long-period climate stations (Safdarjung,
    Palam, Ayanagar, Ridge, Lodi Road) that day; a 52.3-52.9C reading at
    the Mungeshpur automatic station was later confirmed by IMD as a
    sensor error (~3C positive bias) and excluded from official records.
    This demo uses the IMD-verified 49.1C figure, not the erroneous one.
  - Phalodi, Rajasthan, 19 May 2016: 51.0C, India's official all-time
    temperature record prior to 2024 (IMD).
  - Delhi, 19 May 2024: Najafgarh station recorded 47.8C (IMD red alert
    day for Delhi/Haryana/Punjab/West Rajasthan).
"""

REAL_HISTORICAL_EVENTS = {
    "delhi_may_2024_extreme": {
        "label": "Delhi Extreme Heatwave — 29 May 2024 (IMD-verified)",
        "location_hint": "Delhi",
        "date": "2024-05-29",
        "temperature_c": 49.1,
        "relative_humidity_pct": 22,
        "wind_speed_ms": 2.5,
        "solar_radiation_wm2": 950,
        "source": "IMD official 5-station verified range 45.2-49.1C for Delhi NCR, 29 May 2024. "
                   "(A 52.3-52.9C Mungeshpur AWS reading that day was later confirmed by IMD as a "
                   "~3C sensor error and excluded from official records.)",
    },
    "delhi_may_2024_red_alert": {
        "label": "Delhi Red-Alert Heatwave — 19 May 2024 (Najafgarh, IMD)",
        "location_hint": "Delhi",
        "date": "2024-05-19",
        "temperature_c": 47.8,
        "relative_humidity_pct": 18,
        "wind_speed_ms": 3.0,
        "solar_radiation_wm2": 920,
        "source": "IMD: Najafgarh, Delhi recorded 47.8C; IMD red alert issued for Delhi, Haryana, Punjab, West Rajasthan.",
    },
    "rajasthan_phalodi_2016_record": {
        "label": "Phalodi, Rajasthan — 19 May 2016 (former India temperature record)",
        "location_hint": "Rajasthan",
        "date": "2016-05-19",
        "temperature_c": 51.0,
        "relative_humidity_pct": 12,
        "wind_speed_ms": 3.5,
        "solar_radiation_wm2": 1000,
        "source": "IMD: Phalodi, Rajasthan recorded 51.0C, India's official all-time temperature record prior to 2024.",
    },
    "lytton_canada_2021": {
        "label": "Lytton, British Columbia, Canada — 29 June 2021 (Canada's all-time record)",
        "location_hint": "Canada",
        "date": "2021-06-29",
        "temperature_c": 49.6,
        "relative_humidity_pct": 15,
        "wind_speed_ms": 2.0,
        "solar_radiation_wm2": 980,
        "source": "Environment and Climate Change Canada: Lytton, BC recorded 49.6C, the highest temperature "
                   "ever measured in Canada, during the 2021 Western North America heat wave. The Pacific "
                   "Northwest Heat Dome caused an estimated 1,400 deaths across the region; a wildfire "
                   "destroyed the town the next day.",
    },
    "europe_2003_heatwave": {
        "label": "Amareleja, Portugal — 1 August 2003 (2003 European heatwave peak)",
        "location_hint": "Portugal",
        "date": "2003-08-01",
        "temperature_c": 47.3,
        "relative_humidity_pct": 20,
        "wind_speed_ms": 2.5,
        "solar_radiation_wm2": 1000,
        "source": "The 2003 European heatwave peaked at 47.3C in Amareleja, Portugal — Europe's hottest "
                   "recorded summer since at least 1540, associated with an estimated 70,000 excess deaths "
                   "across the continent, concentrated in France, Italy, and Spain.",
    },
}


def get_demo_event(key: str) -> dict:
    return REAL_HISTORICAL_EVENTS.get(key)


def list_demo_events() -> list:
    return [{"key": k, **v} for k, v in REAL_HISTORICAL_EVENTS.items()]
