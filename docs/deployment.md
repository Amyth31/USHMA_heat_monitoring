# Deployment

## Quick start (no Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py                # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

Requires outbound internet access for live weather (Open-Meteo) and
global vulnerability (World Bank API) — both are free, keyless services.
Without internet, weather/vulnerability calls degrade honestly to
`STALE_CACHE` or `UNAVAILABLE` rather than fabricating values; the demo
events (`?demo=<key>`) always work fully offline since they're real
historical data baked into the app.

## Docker

```bash
docker compose up --build
```

Brings up:
- `db` — PostGIS 16, schema auto-applied from `scripts/init_db.sql` on first boot. This includes creating a dedicated `ushma_app` database role with real Row-Level Security policies restricting who can write to the `alerts` table (see "Alert access control" below).
- `backend` — Flask API on :5000, connecting as `ushma_app` (not the admin/owner role — see why below).
- `frontend` — Next.js on :3000

To load the real data into Postgres once the containers are up:
```bash
docker compose exec backend python ../scripts/seed_db.py \
  --dsn postgresql://ushma:ushma_dev_password@db:5432/ushma
```

This was verified end-to-end during development against a real local
PostGIS instance (not just written and assumed to work): schema applied
cleanly, 805 real locations + real Census attributes loaded, a spatial
query (`ST_Area(boundary::geography)`) against Japan's real boundary
returned ~370,000 km² (consistent with its true land area), and the full
alert create→list→get→resolve cycle was exercised against real rows —
including confirming that an unauthorized raw SQL INSERT is genuinely
rejected by the database itself, not just by application code.

## Alert access control (Row-Level Security)

Issuing or resolving an alert requires an `X-Authority-Key` header
matching `AUTHORITY_PASSCODE`. This is enforced twice:

1. **Application layer** (`backend/alerts/alert_service.py`) — refuses
   outright without `is_authority=True`, in both CSV and DB mode.
2. **Database layer** (`scripts/init_db.sql`) — real Postgres Row-Level
   Security on the `alerts` table. `FOR INSERT`/`FOR UPDATE` policies
   check `current_setting('app.is_authority')`, which the backend sets
   via `SET LOCAL` inside the same transaction as the write, only after
   the passcode check passes.

**This only works if the backend connects as a non-superuser, non-owner
role.** Postgres exempts superusers and table owners from RLS
entirely — connecting as the role that ran `init_db.sql` would silently
make every policy a no-op. That's why the schema creates a separate
`ushma_app` role with only the grants it needs, and why `docker-compose.yml`
points `DATABASE_URL` at `ushma_app`, not the owner role. Verified
directly during development: a raw `INSERT` as `ushma_app` without first
setting `app.is_authority` fails with `new row violates row-level
security policy`; the identical insert as the table's owning role
succeeds regardless of any policy (that gap is exactly why the separate
role exists).

Reading alerts (`GET /api/alerts`) is public — no key required. Change
`AUTHORITY_PASSCODE` (and the `ushma_app` password) in any real
deployment; a shared passcode is a prototype-scoped stand-in for real
per-user government accounts (SSO).

## Running tests

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

38 tests, all passing, covering the thermal formulas (including a
regression test for a real degrees/radians bug caught during
development), the vulnerability engine, heatwave detection, the health
risk model's anchor points, and full API integration.

## Environment variables

See `.env.example` at the project root. The frontend needs
`NEXT_PUBLIC_API_BASE` pointed at the backend (defaults to
`http://localhost:5000/api`).

## Production notes

- Rebuild `data/processed/district_master.csv` and `delhi_districts.csv`
  periodically only if the source boundary/census files change — they
  don't need to run on every deploy.
- The World Bank vulnerability cache (`data/processed/world_bank_cache.json`)
  refreshes automatically after 30 days; delete it to force an immediate
  refresh.
- Put a reverse proxy (nginx) in front of both containers for TLS in any
  real deployment; neither Dockerfile here sets up HTTPS.
