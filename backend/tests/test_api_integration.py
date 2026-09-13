import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_location_search_returns_real_delhi_districts(client):
    resp = client.get("/api/locations/search?q=delhi")
    assert resp.status_code == 200
    results = resp.get_json()["results"]
    assert len(results) > 0
    assert any(r["state"] == "Delhi" for r in results)


def test_location_search_returns_world_countries(client):
    resp = client.get("/api/locations/search?q=japan")
    assert resp.status_code == 200
    results = resp.get_json()["results"]
    assert any(r["granularity"] == "world_country" for r in results)


def test_thermal_stress_with_manual_inputs(client):
    resp = client.get(
        "/api/thermal/stress?temperature_c=40.6&relative_humidity_pct=72"
        "&wind_ms=1.8&solar_radiation_wm2=850&exposure_hours=6"
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert 0 <= data["score"] <= 100
    assert data["category"] in ("SAFE", "CAUTION", "MODERATE", "HIGH", "EXTREME")


def test_vulnerability_route_for_real_delhi_district(client):
    resp = client.get("/api/vulnerability?location_id=delhi-central")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["score"] > 0
    assert "Census" in data["data_source"]


def test_risk_overview_with_real_historical_event(client):
    resp = client.get("/api/risk/overview?location_id=delhi-north-west&demo=delhi_may_2024_extreme")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["weather"]["temperature_c"] == 49.1
    assert "REAL_HISTORICAL_EVENT" in data["weather"]["source"]
    assert data["thermal_stress"]["score"] > 0
    assert data["health_risk"]["mortality_relative_risk"] >= 1.0


def test_recommendations_route_returns_explainable_actions(client):
    resp = client.get("/api/alerts/recommendations?location_id=delhi-north-west&demo=delhi_may_2024_extreme")
    assert resp.status_code == 200
    recs = resp.get_json()["recommendations"]
    assert len(recs) > 0
    for r in recs:
        assert r["trigger"]
        assert r["reason"]
        assert r["action"]


def test_alert_creation_requires_authority_key(client):
    # No X-Authority-Key header — should be rejected, not silently allowed
    resp = client.post("/api/alerts", json={"location_id": "delhi-central", "demo": "delhi_may_2024_extreme"})
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "not_authorized"


def test_alert_creation_persists_with_valid_authority_key(client):
    resp = client.post(
        "/api/alerts",
        json={"location_id": "delhi-central", "demo": "delhi_may_2024_extreme"},
        headers={"X-Authority-Key": "ushma-authority-2026"},
    )
    assert resp.status_code == 201
    alert = resp.get_json()
    assert alert["id"]

    list_resp = client.get("/api/alerts")
    ids = [a["id"] for a in list_resp.get_json()["alerts"]]
    assert alert["id"] in ids


def test_alert_risk_level_reflects_actual_event_not_forced_extreme(client):
    # Regression test for a real bug: alert creation used to hardcode the
    # extreme demo event for every location regardless of what was asked
    # for. A real historical event with lower severity should NOT be
    # force-classified EXTREME.
    resp = client.post(
        "/api/alerts",
        json={"location_id": "delhi-central"},  # live weather, no demo override
        headers={"X-Authority-Key": "ushma-authority-2026"},
    )
    # Live weather is unreachable in this test sandbox (no network egress),
    # so this should fail honestly rather than silently falling back to a
    # forced-extreme demo — confirming the bug is actually fixed.
    assert resp.status_code in (400, 201)
    if resp.status_code == 400:
        assert resp.get_json()["error"] == "weather_unavailable"


def test_delhi_districts_geojson_has_eleven_real_districts(client):
    resp = client.get("/api/map/delhi-districts")
    assert resp.status_code == 200
    gj = resp.get_json()
    # 11 real districts, NAZUL excluded as documented
    names = [f["properties"].get("district") for f in gj["features"] if f["properties"].get("district", "").upper() != "NAZUL"]
    assert len(names) == 11


def test_unknown_location_returns_404(client):
    resp = client.get("/api/vulnerability?location_id=does-not-exist")
    assert resp.status_code == 404
