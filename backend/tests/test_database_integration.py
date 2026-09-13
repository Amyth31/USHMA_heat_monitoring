"""
These tests only run when a real Postgres/PostGIS instance is reachable
via DATABASE_URL — they verify the actual database-backed read path
(backend/db.py + the DB branch in location_service.py), not just the
CSV fallback the rest of the suite exercises by default.

Run with:
    DATABASE_URL=postgresql://ushma:ushma_dev_password@localhost:5432/ushma \
        python -m pytest tests/test_database_integration.py -v
"""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

DATABASE_URL = os.environ.get("DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL, reason="DATABASE_URL not set — skipping real-DB integration tests"
)


def test_db_is_enabled():
    from db import is_db_enabled
    assert is_db_enabled() is True


def test_locations_load_from_real_database():
    import services.location_service as ls
    ls._registry = None  # force reload for this test
    locs = ls.list_locations()
    assert len(locs) > 700  # real seeded count: 561 districts + 11 Delhi + 233 world


def test_delhi_district_readable_from_database():
    import services.location_service as ls
    ls._registry = None
    loc = ls.get_location("delhi-central")
    assert loc is not None
    assert loc.population == 582320  # real Census figure, same as CSV path


def test_world_country_boundary_area_queryable_via_postgis():
    from db import get_cursor
    with get_cursor() as cur:
        cur.execute(
            "SELECT ST_Area(boundary::geography) / 1000000 FROM locations WHERE location_id = 'world-jpn'"
        )
        area_km2 = cur.fetchone()[0]
    # Real Japan land area is ~377,975 km2; simplified 50m coastline geometry
    # should land within a reasonable margin of that.
    assert 300_000 < area_km2 < 450_000


def test_vulnerability_engine_reads_census_attributes_from_database():
    import services.vulnerability_engine as ve
    ve._district_cache = None
    result = ve.vulnerability_score("Delhi", "Central")
    assert result is not None
    assert result.score > 0
    assert result.inputs["elderly_pct_50plus"] == 16.24  # real Census figure, must match CSV path


def test_weather_cache_round_trips_through_real_database():
    from services.weather_service import _write_cache, _read_cache
    mock_obs = {
        "location_id": "delhi-central", "timestamp": "2024-05-29T14:00",
        "temperature_c": 46.5, "relative_humidity_pct": 20.0, "wind_speed_ms": 2.1,
        "solar_radiation_wm2": 900.0, "pressure_hpa": 1002.0, "dew_point_c": 18.0,
        "source": "LIVE:open-meteo",
    }
    _write_cache("delhi-central", mock_obs.copy())
    cached = _read_cache("delhi-central")
    assert cached is not None
    assert cached["temperature_c"] == 46.5


def test_alert_full_crud_cycle_against_real_database():
    from alerts.alert_service import create_alert, get_alert, resolve_alert
    alert = create_alert(
        "delhi-central", "Central Delhi", "EXTREME", "Thermal Stress > 80", 3,
        ["Open cooling centres"], is_authority=True,
    )
    assert alert["status"] == "ACTIVE"
    fetched = get_alert(alert["id"])
    assert fetched is not None
    assert fetched["location_name"] == "Central Delhi"
    resolved = resolve_alert(alert["id"], is_authority=True)
    assert resolved["status"] == "RESOLVED"


def test_alert_creation_without_authority_rejected_at_app_layer():
    from alerts.alert_service import create_alert, NotAuthorized
    import pytest as _pytest
    with _pytest.raises(NotAuthorized):
        create_alert(
            "delhi-central", "Central Delhi", "EXTREME", "fake trigger", None,
            ["should not be created"], is_authority=False,
        )


def test_alert_insert_blocked_by_real_postgres_rls_without_authority_flag():
    """
    Bypasses the Python-layer check entirely and issues a raw INSERT as the
    ushma_app role (non-superuser, non-owner) to prove the database itself
    — not just application code — rejects unauthorized writes.
    """
    from db import get_cursor
    import psycopg2
    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        with get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO alerts (id, location_id, risk_level, trigger_description, actions)
                VALUES ('rls-bypass-test', 'delhi-central', 'EXTREME', 'unauthorized raw insert', '[]'::jsonb)
                """
            )
