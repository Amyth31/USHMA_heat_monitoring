-- USHMA database schema — PostgreSQL + PostGIS
-- Run: psql -U postgres -d ushma -f scripts/init_db.sql
--
-- Design note: the running prototype (backend/services/*) currently reads
-- directly from the CSV/JSON files in data/processed/ for simplicity and
-- zero-setup demo reliability. This schema is the target for a real
-- deployment — scripts/seed_db.py loads the same real data (Census 2011,
-- real GIS boundaries) into these tables.
--
-- IMPORTANT — Row-Level Security only works if the app connects as a
-- NON-SUPERUSER, NON-OWNER role. Postgres exempts superusers and table
-- owners from RLS entirely, by design — connecting the Flask backend as
-- whichever role ran this script (the table owner) would silently make
-- every RLS policy below a no-op. This script therefore creates a
-- separate, deliberately limited `ushma_app` role for the backend to
-- actually connect as; see the bottom of this file.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------
-- locations: every real queryable location (India districts, Delhi
-- sub-districts, world countries), unified with the same fields the
-- location_service.py registry already uses.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    location_id     TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    state           TEXT NOT NULL,
    district        TEXT NOT NULL,
    country_iso3    TEXT,
    granularity     TEXT NOT NULL CHECK (granularity IN ('district', 'delhi_subdistrict', 'world_country')),
    population      BIGINT,
    area_km2        DOUBLE PRECISION,
    -- Real Census 2011 attributes (India district/delhi_subdistrict rows only,
    -- NULL for world_country rows — those use the vulnerability table's
    -- inputs JSONB, populated live from the World Bank API instead)
    elderly_pct_50plus         DOUBLE PRECISION,
    outdoor_worker_pct         DOUBLE PRECISION,
    literacy_pct                DOUBLE PRECISION,
    household_electricity_pct   DOUBLE PRECISION,
    geom            GEOMETRY(Point, 4326) NOT NULL,
    boundary        GEOMETRY(MultiPolygon, 4326)  -- NULL for point-only locations (world countries)
);
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_locations_boundary ON locations USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations USING GIN (to_tsvector('simple', name));

-- ---------------------------------------------------------------------
-- weather_observations: real observed weather (live provider fetches)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_observations (
    id                      BIGSERIAL PRIMARY KEY,
    location_id             TEXT NOT NULL REFERENCES locations(location_id),
    observed_at             TIMESTAMPTZ NOT NULL,
    temperature_c           DOUBLE PRECISION NOT NULL,
    relative_humidity_pct   DOUBLE PRECISION NOT NULL,
    wind_speed_ms           DOUBLE PRECISION NOT NULL,
    solar_radiation_wm2     DOUBLE PRECISION NOT NULL,
    pressure_hpa            DOUBLE PRECISION,
    dew_point_c             DOUBLE PRECISION,
    source                  TEXT NOT NULL,  -- 'LIVE:open-meteo' | 'STALE_CACHE' | 'REAL_HISTORICAL_EVENT:...'
    fetched_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_weather_obs_location_time ON weather_observations (location_id, observed_at DESC);

-- ---------------------------------------------------------------------
-- weather_forecasts: real 5-day forecast snapshots
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_forecasts (
    id                      BIGSERIAL PRIMARY KEY,
    location_id             TEXT NOT NULL REFERENCES locations(location_id),
    forecast_for            DATE NOT NULL,
    temperature_c           DOUBLE PRECISION NOT NULL,
    relative_humidity_pct   DOUBLE PRECISION NOT NULL,
    wind_speed_ms           DOUBLE PRECISION NOT NULL,
    solar_radiation_wm2     DOUBLE PRECISION NOT NULL,
    source                  TEXT NOT NULL,
    fetched_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (location_id, forecast_for, fetched_at)
);

-- ---------------------------------------------------------------------
-- thermal_indices: computed Heat Index / WBGT / UTCI / Thermal Stress,
-- one row per weather_observations row they were derived from.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermal_indices (
    id                      BIGSERIAL PRIMARY KEY,
    weather_observation_id  BIGINT NOT NULL REFERENCES weather_observations(id),
    heat_index_c            DOUBLE PRECISION NOT NULL,
    heat_index_extrapolated BOOLEAN NOT NULL DEFAULT FALSE,
    wbgt_c                  DOUBLE PRECISION NOT NULL,
    wbgt_indoor_shade_c     DOUBLE PRECISION NOT NULL,
    utci_c                  DOUBLE PRECISION NOT NULL,
    utci_category           TEXT NOT NULL,
    thermal_stress_score    DOUBLE PRECISION NOT NULL,
    thermal_stress_category TEXT NOT NULL,
    contributions           JSONB NOT NULL  -- full contribution breakdown, for explainability
);

-- ---------------------------------------------------------------------
-- vulnerability: one row per location, real Census 2011 / World Bank
-- derived score. Re-computed and upserted when source data refreshes
-- (Census is decennial; World Bank indicators are ~annual).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vulnerability (
    location_id             TEXT PRIMARY KEY REFERENCES locations(location_id),
    score                   DOUBLE PRECISION NOT NULL,
    category                TEXT NOT NULL,
    contributions           JSONB NOT NULL,
    inputs                  JSONB NOT NULL,
    data_source             TEXT NOT NULL,
    computed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- health_risk_predictions: relative-risk estimates, anchored to the
-- documented Ahmedabad HAP study curve (see backend/ml/health_risk_engine.py)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_risk_predictions (
    id                          BIGSERIAL PRIMARY KEY,
    location_id                 TEXT NOT NULL REFERENCES locations(location_id),
    predicted_for                DATE NOT NULL,
    mortality_relative_risk      DOUBLE PRECISION NOT NULL,
    mortality_risk_category      TEXT NOT NULL,
    hospitalization_relative_risk DOUBLE PRECISION NOT NULL,
    hospitalization_risk_category TEXT NOT NULL,
    explanation                  JSONB NOT NULL,
    methodology_note             TEXT NOT NULL,
    computed_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- alerts: generated from the risk pipeline (mirrors alerts/alert_service.py)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id                       TEXT PRIMARY KEY,
    location_id              TEXT NOT NULL REFERENCES locations(location_id),
    risk_level                TEXT NOT NULL,
    trigger_description       TEXT NOT NULL,
    expected_duration_days    INT,
    actions                   JSONB NOT NULL,
    status                    TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Public (read-only) access: anyone can see active/resolved alerts.
DROP POLICY IF EXISTS alerts_select_public ON alerts;
CREATE POLICY alerts_select_public ON alerts
    FOR SELECT USING (true);

-- Only a session explicitly marked as an authority (set via
-- `SET LOCAL app.is_authority = 'true'` after a passcode check in
-- backend/alerts/alert_service.py) may create or update alerts. This
-- is real Postgres Row-Level Security, not just an application-layer
-- check — even a compromised or misconfigured API path cannot insert
-- rows into this table without the database itself granting permission.
DROP POLICY IF EXISTS alerts_insert_authority_only ON alerts;
CREATE POLICY alerts_insert_authority_only ON alerts
    FOR INSERT WITH CHECK (current_setting('app.is_authority', true) = 'true');

DROP POLICY IF EXISTS alerts_update_authority_only ON alerts;
CREATE POLICY alerts_update_authority_only ON alerts
    FOR UPDATE USING (current_setting('app.is_authority', true) = 'true');

-- FORCE means RLS applies even to the table owner if it isn't a superuser
-- (superusers are always exempt regardless — this is a Postgres design
-- decision, not something a policy can override). Combined with the
-- ushma_app role below (non-superuser, non-owner), this makes the policy
-- above the actual, real enforcement path — not just documentation.
ALTER TABLE alerts FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- recommendations: explainable rule-engine output (mirrors
-- services/decision_support.py); persisted per alert for audit trail.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
    id             BIGSERIAL PRIMARY KEY,
    alert_id       TEXT REFERENCES alerts(id),
    trigger_desc   TEXT NOT NULL,
    risk_level     TEXT NOT NULL,
    reason         TEXT NOT NULL,
    action         TEXT NOT NULL,
    category       TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- ushma_app: the role the Flask backend actually connects as. Deliberately
-- NOT a superuser and NOT the owner of any table — both would bypass RLS
-- entirely regardless of the policies above. Grant only what the app
-- genuinely needs: read everywhere, write on the operational tables, but
-- alerts INSERT/UPDATE are still gated by the RLS policies above (this
-- role can pass WITH CHECK only when the app sets app.is_authority via
-- SET LOCAL after a passcode check — see backend/alerts/alert_service.py).
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ushma_app') THEN
        CREATE ROLE ushma_app WITH LOGIN PASSWORD 'change_this_password_in_production';
    END IF;
END
$$;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO ushma_app;
GRANT INSERT, UPDATE ON locations, weather_observations, weather_forecasts,
    thermal_indices, vulnerability, health_risk_predictions, alerts, recommendations
    TO ushma_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ushma_app;
