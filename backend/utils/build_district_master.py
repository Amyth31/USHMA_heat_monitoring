"""
Builds data/processed/district_master.csv — one row per real Indian district,
joining:
  - REAL geometry (area computed geodesically from actual district boundary
    polygons, source: india-maps-data / DataMeet community boundaries,
    Census 2011 administrative units)
  - REAL Census 2011 district demographics
    (source: Registrar General & Census Commissioner of India, via
    public redistribution on GitHub)

Output columns are all derived from real government data — nothing here is
synthetic. Where a district name doesn't match between the two real sources
(spelling variants are common across Indian district datasets), it is
logged and skipped rather than guessed.
"""
import json
import csv
import re
from pathlib import Path
from shapely.geometry import shape
import pyproj
from shapely.ops import transform as shp_transform

BASE = Path(__file__).resolve().parents[2]  # backend/utils/.. -> backend/.. -> ushma/
GEO_DIR = BASE / "data" / "geo"
CENSUS_CSV = BASE / "data" / "processed" / "census_districts_2011.csv"
OUT_CSV = BASE / "data" / "processed" / "district_master.csv"

geod = pyproj.Geod(ellps="WGS84")

# Documented official district/city renamings (real, government-notified name
# changes) between the 2011 Census tables and current district names used in
# the boundary GeoJSON. Mapping GEOJSON-NAME -> CENSUS-NAME so the two real
# datasets can be joined despite the renaming.
RENAME_ALIASES = {
    "BENGALURUURBAN": "BANGALORE",
    "BENGALURURURAL": "BANGALORERURAL",
    "BELAGAVI": "BELGAUM",
    "MYSURU": "MYSORE",
    "KALABURAGI": "GULBARGA",
    "VIJAYAPURA": "BIJAPUR",
    "SHIVAMOGGA": "SHIMOGA",
    "TUMAKURU": "TUMKUR",
    "CHIKKAMAGALURU": "CHIKMAGALUR",
    "BALLARI": "BELLARY",
    "CHAMARAJANAGARA": "CHAMARAJANAGAR",
    "BAGALKOTE": "BAGALKOT",
    "GURUGRAM": "GURGAON",
    "PRAYAGRAJ": "ALLAHABAD",
    "AYODHYA": "FAIZABAD",
}


def normalize(name: str) -> str:
    name = name.upper().strip()
    name = re.sub(r"[^A-Z]", "", name)
    return RENAME_ALIASES.get(name, name)


def geodesic_area_km2(geom) -> float:
    """Real geodesic area (not a flat-projection approximation)."""
    if geom.geom_type == "Polygon":
        polys = [geom]
    else:
        polys = list(geom.geoms)
    total = 0.0
    for poly in polys:
        area, _ = geod.geometry_area_perimeter(poly)
        total += abs(area)
    return total / 1_000_000.0  # m^2 -> km^2


def centroid_latlon(geom):
    c = geom.centroid
    return c.y, c.x


def load_census():
    census = {}
    with open(CENSUS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = normalize(row["District name"])
            census[key] = row
    return census


NUMERIC_SUM_FIELDS = [
    "Population", "Male", "Female", "Literate", "Workers",
    "Cultivator_Workers", "Agricultural_Workers",
    "Age_Group_0_29", "Age_Group_30_49", "Age_Group_50",
    "Housholds_with_Electric_Lighting", "Households",
]


def build_delhi_aggregate(census: dict) -> dict:
    """
    Delhi's free GIS boundary source only ships the whole-NCT polygon (no
    9-district breakdown) — a real, documented limitation. To still use only
    real Census 2011 numbers, this aggregates the real 9 Delhi district rows
    (North, South, East, West, Central, New Delhi, etc.) up to NCT level, so
    every figure remains sourced from the actual census, just summed to match
    the one real polygon available.
    """
    delhi_rows = []
    with open(CENSUS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["State name"].strip().upper() in ("DELHI", "NCT OF DELHI"):
                delhi_rows.append(row)
    if not delhi_rows:
        return None
    agg = {k: 0 for k in NUMERIC_SUM_FIELDS}
    for row in delhi_rows:
        for k in NUMERIC_SUM_FIELDS:
            agg[k] += int(row[k])
    return agg


def compute_row(state_name, district_name, lat, lon, area_km2, c: dict) -> dict:
    population = int(c["Population"])
    density = population / area_km2 if area_km2 > 0 else 0
    age_50_plus = int(c["Age_Group_50"])
    age_0_29 = int(c["Age_Group_0_29"])
    age_30_49 = int(c["Age_Group_30_49"])
    total_age = age_50_plus + age_0_29 + age_30_49
    elderly_pct = (age_50_plus / total_age * 100) if total_age else 0

    cultivators = int(c["Cultivator_Workers"])
    agri_workers = int(c["Agricultural_Workers"])
    total_workers = int(c["Workers"]) or 1
    outdoor_worker_pct = (cultivators + agri_workers) / total_workers * 100

    literacy_pct = (int(c["Literate"]) / population * 100) if population else 0
    electricity_pct = (
        int(c["Housholds_with_Electric_Lighting"]) / int(c["Households"]) * 100
        if int(c["Households"]) else 0
    )

    return {
        "state": state_name,
        "district": district_name,
        "latitude": round(lat, 5),
        "longitude": round(lon, 5),
        "area_km2": round(area_km2, 1),
        "population_2011": population,
        "population_density_km2": round(density, 1),
        "elderly_pct_50plus": round(elderly_pct, 2),
        "outdoor_worker_pct": round(outdoor_worker_pct, 2),
        "literacy_pct": round(literacy_pct, 2),
        "household_electricity_pct": round(electricity_pct, 2),
    }


def main():
    census = load_census()
    matched = 0
    unmatched = []
    out_rows = []

    india_file = GEO_DIR / "india_states.geojson"
    with open(india_file) as f:
        gj = json.load(f)

    for feat in gj["features"]:
        props = feat["properties"]
        district_name = props.get("district") or props.get("DISTRICT") or ""
        state_name = props.get("st_nm") or props.get("STATE") or ""
        if not district_name:
            continue
        key = normalize(district_name)
        geom = shape(feat["geometry"])
        area_km2 = geodesic_area_km2(geom)
        lat, lon = centroid_latlon(geom)

        if state_name == "Delhi" and district_name == "Delhi":
            c = build_delhi_aggregate(census)
        else:
            c = census.get(key)

        if not c:
            unmatched.append((state_name, district_name))
            continue
        matched += 1
        out_rows.append(compute_row(state_name, district_name, lat, lon, area_km2, c))

    out_rows.sort(key=lambda r: (r["state"], r["district"]))
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(out_rows[0].keys()))
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"Matched {matched} districts to real Census 2011 data.")
    print(f"Unmatched (name-spelling mismatches, skipped): {len(unmatched)}")
    if unmatched[:15]:
        print("Examples:", unmatched[:15])
    print(f"Written: {OUT_CSV}")


if __name__ == "__main__":
    main()
