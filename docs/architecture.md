# Architecture

## Overview

USHMA is a modular monolith: one Flask backend, one Next.js frontend, and
a real-data layer (CSV/JSON in the prototype, PostgreSQL/PostGIS schema
ready for production — see `data.md`).

```
Weather (live: Open-Meteo)          World Bank Indicators (live)
        |                                    |
        v                                    v
Thermal Index Engine  <-------------  Vulnerability Engine
(Heat Index, WBGT,                    (India: Census 2011 district data
 UTCI, Thermal Stress)                 World: World Bank country data)
        |                                    |
        +------------------+-----------------+
                            v
                  Human Thermal Stress Score
                            |
                            v
                   Heatwave Detection Engine
        (India: IMD criteria | World: WMO criteria)
                            |
                            v
                    Health Risk Engine
        (anchored to Ahmedabad HAP study, PMC6236972)
                            |
                            v
              Decision Support / Recommendations
                            |
              +-------------+-------------+
              v                           v
        Alert Service                GIS / Map Endpoints
        (Flask REST API)          (real district & country boundaries)
                            |
                            v
                    Next.js Frontend
   (landing, dashboard, risk-map, forecast, thermal-stress,
    health-risk, alerts, analytics, methodology, about)
```

## Backend layout

```
backend/
├── app.py                     Flask app factory, blueprint registration
├── routes/                    One blueprint per API surface
│   ├── locations.py
│   ├── weather.py
│   ├── thermal.py
│   ├── vulnerability.py
│   ├── risk.py                orchestrates the full pipeline per location
│   ├── map_routes.py          GeoJSON endpoints
│   ├── alerts.py
│   └── analytics.py
├── services/                  Business logic, independent of Flask
│   ├── location_service.py    unified real-location registry
│   ├── weather_service.py     live weather + honest cache fallback
│   ├── vulnerability_engine.py        India (Census 2011)
│   ├── global_vulnerability_service.py  World (World Bank)
│   ├── heatwave_engine.py             India (IMD criteria)
│   ├── global_heatwave_engine.py      World (WMO criteria)
│   └── decision_support.py    explainable rules engine
├── thermal/
│   └── indices.py             Heat Index, WBGT, UTCI, Thermal Stress
├── ml/
│   └── health_risk_engine.py  relative-risk model (real anchor points)
├── weather/providers/
│   ├── base_provider.py       abstract interface
│   ├── live_provider.py       Open-Meteo implementation
│   └── demo_events.py         real historical heatwave events
├── alerts/
│   └── alert_service.py       alert persistence
├── utils/
│   ├── build_district_master.py    joins Census 2011 + real boundaries
│   └── build_delhi_districts.py    Delhi's 11 real current districts
└── tests/                     pytest suite, 38 tests, all real-data-backed
```

## Design decisions

- **Modular monolith, not microservices.** The SIH brief explicitly asks
  for this; the whole pipeline runs in one Flask process with clearly
  separated modules, which is easier to demo reliably and reason about
  than a distributed system for a prototype this size.
- **India vs. World depth asymmetry is intentional, not a shortcut.**
  India has real district-level Census data; nothing else does at that
  granularity for free. Every service branches on `location.granularity`
  to pick the right engine (`vulnerability_engine` vs.
  `global_vulnerability_service`, `heatwave_engine` vs.
  `global_heatwave_engine`) rather than silently degrading global
  locations to fake district-level numbers.
- **Never fabricate on failure.** Every live data source (weather, World
  Bank, climatology) degrades to a clearly-labeled cached/unavailable
  state rather than inventing a plausible-looking number. This shows up
  as `status: "STALE_CACHE"` / `"UNAVAILABLE"` fields throughout the API.
- **CSV/JSON now, Postgres-ready schema already defined.** The services
  layer reads flat files for zero-setup demo reliability; `scripts/init_db.sql`
  and `scripts/seed_db.py` define and populate the real production schema
  without changing what data exists — only how it would be read.
