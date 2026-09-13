#!/usr/bin/env python3
"""
Loads the real data already built in data/processed/ and data/geo/ into
PostgreSQL/PostGIS (schema: scripts/init_db.sql). Run after init_db.sql.

Usage:
    python scripts/seed_db.py --dsn postgresql://user:pass@localhost:5432/ushma

This does not invent or transform any data — it's a straight load of the
same CSV/GeoJSON files the running Flask prototype reads directly. See
backend/utils/build_district_master.py and build_delhi_districts.py for
how those real source files were built from Census 2011 + real boundaries.
"""
import argparse
import csv
import json
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    print("Missing dependency: pip install psycopg2-binary --break-system-packages", file=sys.stderr)
    sys.exit(1)

BASE = Path(__file__).resolve().parents[1]


def slugify(*parts):
    s = "-".join(parts)
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")


def load_india_districts(cur):
    path = BASE / "data" / "processed" / "district_master.csv"
    count = 0
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            loc_id = slugify(row["state"], row["district"])
            cur.execute(
                """
                INSERT INTO locations (location_id, name, state, district, granularity,
                                        population, area_km2,
                                        elderly_pct_50plus, outdoor_worker_pct,
                                        literacy_pct, household_electricity_pct, geom)
                VALUES (%s, %s, %s, %s, 'district', %s, %s, %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                ON CONFLICT (location_id) DO NOTHING
                """,
                (loc_id, row["district"], row["state"], row["district"],
                 int(row["population_2011"]), float(row["area_km2"]),
                 float(row["elderly_pct_50plus"]), float(row["outdoor_worker_pct"]),
                 float(row["literacy_pct"]), float(row["household_electricity_pct"]),
                 float(row["longitude"]), float(row["latitude"])),
            )
            count += 1
    print(f"Loaded {count} real India districts (Census 2011) — includes the coarse "
          f"whole-NCT 'Delhi' row alongside the 11 real sub-districts below, for direct "
          f"state/district vulnerability lookups; location_service.py excludes the coarse "
          f"row from search results the same way in both DB and file mode.")


def load_delhi_districts(cur):
    path = BASE / "data" / "processed" / "delhi_districts.csv"
    if not path.exists():
        return
    count = 0
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            loc_id = slugify("Delhi", row["district"])
            cur.execute(
                """
                INSERT INTO locations (location_id, name, state, district, granularity,
                                        population, area_km2,
                                        elderly_pct_50plus, outdoor_worker_pct,
                                        literacy_pct, household_electricity_pct, geom)
                VALUES (%s, %s, 'Delhi', %s, 'delhi_subdistrict', %s, %s, %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                ON CONFLICT (location_id) DO NOTHING
                """,
                (loc_id, f"{row['district']} Delhi", row["district"],
                 int(row["population_2011"]), float(row["area_km2"]),
                 float(row["elderly_pct_50plus"]), float(row["outdoor_worker_pct"]),
                 float(row["literacy_pct"]), float(row["household_electricity_pct"]),
                 float(row["longitude"]), float(row["latitude"])),
            )
            count += 1
    print(f"Loaded {count} real Delhi districts (Census 2011, areally apportioned)")


def load_world_countries(cur):
    path = BASE / "data" / "geo" / "world_countries.geojson"
    if not path.exists():
        return
    gj = json.loads(path.read_text())
    count = 0
    for feat in gj["features"]:
        props = feat["properties"]
        iso3 = props.get("ISO_A3")
        name = props.get("NAME")
        if not iso3 or iso3 == "-99" or iso3 == "IND":
            continue  # India covered at district granularity above
        loc_id = slugify("world", iso3)
        # Compute a representative point from the geometry using PostGIS
        # itself (ST_Centroid) after inserting the boundary, to avoid
        # needing shapely here.
        geom_json = json.dumps(feat["geometry"])
        cur.execute(
            """
            INSERT INTO locations (location_id, name, state, district, country_iso3,
                                    granularity, population, area_km2, geom, boundary)
            VALUES (%s, %s, %s, %s, %s, 'world_country', %s, 0,
                    ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)),
                    ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))
            ON CONFLICT (location_id) DO NOTHING
            """,
            (loc_id, name, props.get("CONTINENT", ""), iso3, iso3,
             int(props.get("POP_EST") or 0), geom_json, geom_json),
        )
        count += 1
    print(f"Loaded {count} real world countries (Natural Earth)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dsn", required=True, help="postgresql://user:pass@host:port/dbname")
    args = parser.parse_args()

    conn = psycopg2.connect(args.dsn)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            load_india_districts(cur)
            load_delhi_districts(cur)
            load_world_countries(cur)
        conn.commit()
        print("Done. All data loaded is real (Census 2011 + Natural Earth boundaries) — nothing synthetic.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
