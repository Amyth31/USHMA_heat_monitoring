# API Reference

Base URL: `http://localhost:5000/api`

All endpoints return JSON. Errors follow `{"error": "<type>", "message": "<detail>"}`
with an appropriate HTTP status code (400, 404, 500).

## Health
`GET /health` → `{"status": "ok", "service": "USHMA backend"}`

## Locations
- `GET /locations?state=<optional>` — list all real locations (India districts, Delhi sub-districts, world countries)
- `GET /locations/search?q=<query>&limit=10` — search by name/state
- `GET /locations/<location_id>` — get one location

## Weather (live, real)
- `GET /weather/current?location_id=<id>` — current conditions from Open-Meteo, or honest `STALE_CACHE`/`UNAVAILABLE`
- `GET /weather/forecast?location_id=<id>&days=5` — 5-day forecast

## Thermal indices
- `GET /thermal/heat-index?location_id=<id>` or `?temperature_c=&relative_humidity_pct=`
- `GET /thermal/wbgt?...` — same input options, plus `wind_ms`, `solar_radiation_wm2`
- `GET /thermal/utci?...`
- `GET /thermal/stress?...&exposure_hours=4` — composite Human Thermal Stress Score with full breakdown

## Vulnerability
- `GET /vulnerability?location_id=<id>` — India: real Census 2011 score. World: real World Bank score.

## Risk (full pipeline)
- `GET /risk/overview?location_id=<id>&demo=<optional event key>` — weather + all thermal indices + vulnerability + heatwave status + health risk in one call
- `GET /risk/demo-events` — list of real historical heatwave events usable via `?demo=`
- `GET /risk/mortality?location_id=<id>` — health risk only
- `GET /risk/hospitalization?location_id=<id>` — health risk only

## Map / GIS
- `GET /map/delhi-districts` — real 11-district Delhi GeoJSON, annotated with vulnerability
- `GET /map/india-districts` — real all-India district boundaries (760 features)
- `GET /map/world-countries` — real Natural Earth country boundaries (242 features), annotated with World Bank vulnerability
- `GET /map/risk-layer?state=<optional>` — point markers with vulnerability, capped at 200

## Alerts
- `GET /alerts?status=&risk_level=` — list alerts
- `GET /alerts/<id>` — get one alert
- `POST /alerts` `{"location_id": "...", "demo": "optional"}` — generate an alert from the live risk pipeline
- `POST /alerts/<id>/resolve` — mark resolved
- `GET /alerts/recommendations?location_id=<id>&demo=<optional>` — explainable recommendations only

## Analytics (real data only)
- `GET /analytics/historical-events` — real documented heatwave events for comparison
- `GET /analytics/top-vulnerable-districts?limit=10&state=<optional>` — real Census-derived ranking
- `GET /analytics/vulnerability-distribution` — real category counts across all matched India districts

## Demo mode
Any risk/alert endpoint accepts `?demo=<key>` (or `"demo"` in a POST body)
to replay a real historical heatwave event instead of live weather — see
`GET /risk/demo-events` for the current list (Delhi 29 May 2024, Delhi 19
May 2024, Phalodi 2016, Lytton Canada 2021, 2003 European heatwave).
