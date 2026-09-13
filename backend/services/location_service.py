"""
Location Service — single source of truth for every real, queryable
location in USHMA. Backed by the real data built in
backend/utils/build_district_master.py and build_delhi_districts.py.

If DATABASE_URL is set, reads from the real PostgreSQL/PostGIS database
instead of the CSV/GeoJSON files directly (same real data, different
storage — see backend/db.py). Falls back to CSV/GeoJSON otherwise.
"""
from __future__ import annotations
import csv
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

from db import is_db_enabled, get_cursor

BASE = Path(__file__).resolve().parents[2]
DISTRICT_CSV = BASE / "data" / "processed" / "district_master.csv"
DELHI_CSV = BASE / "data" / "processed" / "delhi_districts.csv"
WORLD_GEOJSON = BASE / "data" / "geo" / "world_countries.geojson"


@dataclass
class Location:
    location_id: str
    name: str
    state: str
    district: str
    latitude: float
    longitude: float
    population: int
    area_km2: float
    granularity: str  # "district" | "delhi_subdistrict" | "world_country"
    iso3: Optional[str] = None


_registry: Optional[dict] = None


def _slugify(*parts: str) -> str:
    s = "-".join(parts)
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")


def _row_to_location(row) -> Location:
    (location_id, name, state, district, iso3, granularity, population, area_km2, lon, lat) = row
    return Location(
        location_id=location_id, name=name, state=state, district=district,
        latitude=lat, longitude=lon, population=population or 0,
        area_km2=area_km2 or 0.0, granularity=granularity, iso3=iso3,
    )


_DB_SELECT = """
    SELECT location_id, name, state, district, country_iso3, granularity,
           population, area_km2, ST_X(geom), ST_Y(geom)
    FROM locations
    WHERE NOT (state = 'Delhi' AND district = 'Delhi' AND granularity = 'district')
"""


def _load_from_db() -> dict:
    registry = {}
    with get_cursor() as cur:
        cur.execute(_DB_SELECT)
        for row in cur.fetchall():
            loc = _row_to_location(row)
            registry[loc.location_id] = loc
    return registry


def _load_from_files() -> dict:
    registry = {}

    with open(DISTRICT_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            # Skip the coarse Delhi NCT row — we use the 11 real sub-districts instead
            if row["state"] == "Delhi" and row["district"] == "Delhi":
                continue
            loc_id = _slugify(row["state"], row["district"])
            registry[loc_id] = Location(
                location_id=loc_id,
                name=row["district"],
                state=row["state"],
                district=row["district"],
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                population=int(row["population_2011"]),
                area_km2=float(row["area_km2"]),
                granularity="district",
            )

    if DELHI_CSV.exists():
        with open(DELHI_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                loc_id = _slugify("Delhi", row["district"])
                registry[loc_id] = Location(
                    location_id=loc_id,
                    name=f"{row['district']} Delhi",
                    state="Delhi",
                    district=row["district"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    population=int(row["population_2011"]),
                    area_km2=float(row["area_km2"]),
                    granularity="delhi_subdistrict",
                )

    if WORLD_GEOJSON.exists():
        import json
        from shapely.geometry import shape

        with open(WORLD_GEOJSON, encoding="utf-8") as f:
            gj = json.load(f)
        for feat in gj["features"]:
            props = feat["properties"]
            name = props.get("NAME")
            iso3 = props.get("ISO_A3")
            if not name or not iso3 or iso3 == "-99":
                continue
            # Skip India — already covered at real district granularity above
            if iso3 == "IND":
                continue
            geom = shape(feat["geometry"])
            centroid = geom.centroid
            loc_id = _slugify("world", iso3)
            registry[loc_id] = Location(
                location_id=loc_id,
                name=name,
                state=props.get("CONTINENT", ""),
                district=iso3,
                latitude=round(centroid.y, 5),
                longitude=round(centroid.x, 5),
                population=int(props.get("POP_EST") or 0),
                area_km2=0.0,  # not computed at country scale; density comes from World Bank instead
                granularity="world_country",
                iso3=iso3,
            )

    return registry


def _load() -> dict:
    global _registry
    if _registry is not None:
        return _registry

    if is_db_enabled():
        try:
            _registry = _load_from_db()
            return _registry
        except Exception:
            pass  # fall through to file-based read below; never crash the app over DB unavailability

    _registry = _load_from_files()
    return _registry


def get_location(location_id: str) -> Optional[Location]:
    return _load().get(location_id)


def list_locations(state: Optional[str] = None) -> list:
    locs = list(_load().values())
    if state:
        locs = [l for l in locs if l.state.lower() == state.lower()]
    return sorted(locs, key=lambda l: (-l.population))


def search_locations(query: str, limit: int = 10) -> list:
    q = query.strip().lower()
    if not q:
        return []
    matches = [
        l for l in _load().values()
        if q in l.name.lower() or q in l.state.lower() or q in l.district.lower()
    ]
    matches.sort(key=lambda l: (not l.name.lower().startswith(q), -l.population))
    return matches[:limit]
