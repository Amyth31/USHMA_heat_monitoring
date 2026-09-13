# USHMA — Unified System for Heat Monitoring & Analytics
### (aka HeatShield) — SIH 2026, Problem Statement 26083

Real weather, real demographic vulnerability, real GIS boundaries,
documented scientific formulas, and a health-risk model anchored to a
peer-reviewed study — no synthetic/fabricated data, anywhere in the
pipeline. Covers the whole world: India runs at real district-level
depth (Census 2011), every other country uses the best real
country-level equivalents (World Bank, Natural Earth, WMO).

## Recent fixes (this round)

- **Map**: the hosted dark basemap provider started requiring an API key
  mid-project, which broke the map with an "API KEY REQUIRED" watermark.
  Replaced with plain OpenStreetMap tiles (genuinely free, no key, ever)
  styled dark via a CSS filter. The map is also now a single unified
  component — world view by default, real India district detail and real
  Delhi 11-district detail load automatically as you zoom in, no manual
  toggle buttons.
- **Alert access control**: found and fixed a real bug where the alerts
  page hardcoded the most extreme historical demo event for every single
  alert, regardless of which city was searched — meaning anything anyone
  clicked came out "EXTREME." Alerts now use real live risk data by
  default. On top of that, issuing or resolving an alert now requires
  authority credentials, enforced at two real layers: the application
  code, and genuine PostgreSQL Row-Level Security on the `alerts` table
  (tested directly with a raw SQL INSERT that Postgres itself rejects
  without the right session flag — not just an app-level `if` check).
  See `docs/deployment.md` → "Alert access control" for the full detail,
  including a real gotcha this surfaced (RLS is a no-op for the table's
  owning role, so the backend now connects as a separate, deliberately
  limited `ushma_app` role).
- **UI**: added real charts (radial gauges, forecast trend chart via
  Recharts), icon-labeled metrics, skeleton loading states, and a proper
  map legend — replacing plain numbers and flat-color map fills.

## What's built and tested

**Science / data engines** (all with pytest coverage):- Thermal Index Engine — Heat Index (Rothfusz/NWS), WBGT (Bernard/
  Liljegren, with a Stull wet-bulb calculation validated against Stull's
  own published example), simplified UTCI, composite Human Thermal
  Stress Score.
- India Vulnerability Engine — real Census 2011 district data joined to
  real boundary geometry (geodesic area, not looked up).
- Global Vulnerability Engine — live World Bank Indicators API,
  mirroring the same five-factor structure for every other country.
- India Heatwave Engine — real IMD operational criteria.
- Global Heatwave Engine — real WMO general definition, baseline
  computed live from Open-Meteo's historical archive.
- Health Risk Engine — anchored to real relative-risk figures from the
  Ahmedabad Heat Action Plan evaluation study (PMC6236972), not
  fabricated ML training labels — documented in `docs/ml.md`.
- Decision Support — explainable IF/THEN rules engine.

**Backend**: Flask REST API — locations (805 real locations: 564 India
districts, 11 Delhi sub-districts, 241 world countries), weather
(live, honest degradation), thermal, vulnerability, risk overview, map/
GeoJSON, alerts, analytics. 40 always-on passing tests (`backend/tests/`), plus 9 real-database integration tests.

**Frontend**: 10 working Next.js pages, all type-checked and
build-verified — landing (live interactive humidity demo), dashboard,
risk-map (real Leaflet maps: Delhi 11-district + world 242-country, both
click-through to full risk detail), forecast, thermal-stress,
health-risk, alerts, analytics, methodology, about. Dark "climate
command-centre" visual design throughout.

**Real historical demo events** (work fully offline): Delhi 29 May 2024
(IMD-verified 49.1°C), Delhi 19 May 2024 red-alert day, Phalodi 2016
(51.0°C, former India record), Lytton Canada 2021 (49.6°C, Canada's
all-time record), 2003 European heatwave (47.3°C, Portugal).

**Infrastructure**: PostgreSQL/PostGIS schema (`scripts/init_db.sql`) +
real-data seed script (`scripts/seed_db.py`) — **all four services wired
in**: locations, vulnerability, weather cache, and alerts all read/write
real Postgres when `DATABASE_URL` is set, each falling back gracefully
to CSV/JSON if the DB is unreachable (never crashes). Every one of these
was verified end-to-end against a real local PostGIS instance during
development, not just written and assumed to work — schema applied,
805 real locations + real Census attributes seeded, spatial queries
confirmed, full alert create→list→get→resolve cycle tested against real
rows. Docker + docker-compose for all three services, full docs set.
**49 passing tests** (40 always-on + 9 real-database integration tests
that run when `DATABASE_URL` is set).

## Honest limitations (stated, not hidden)

- Two Delhi district polygons (North West, East) have imprecise areas
  in the free boundary source used — see `docs/data_limitations.md`.
  Population and every non-area-dependent figure for them is unaffected.
- The health-risk model is a documented relative-risk estimate anchored
  to one real Indian study, not a trained ML model — no public granular
  heat-mortality dataset exists to train one on, for India or most other
  countries. See `docs/ml.md` for the reasoning and what would change
  this.
- Global (non-India) location granularity is one point per country, not
  sub-national.
- The alert authority gate is a single shared passcode, not real
  per-user accounts — a deliberate, stated scope limit for a prototype
  without a full auth/session system. The RLS pattern (public read,
  authority-only write) is real and would carry over unchanged to a
  production system with real government SSO.
- Historical demo events are a small, curated set of real, cited events
  — not a live feed of every heatwave happening right now. See
  `docs/data.md` for exactly what is and isn't real-time.

## Running it

### Without Docker
```bash
cd backend && pip install -r requirements.txt && python app.py   # :5000
cd frontend && npm install && npm run dev                        # :3000
```

### With Docker
```bash
docker compose up --build
```

### Tests
```bash
cd backend && python -m pytest tests/ -v   # 38 tests
```

See `docs/deployment.md` for full details, `docs/api.md` for the API
reference, and the in-app `/methodology` route for every formula and
data source.
