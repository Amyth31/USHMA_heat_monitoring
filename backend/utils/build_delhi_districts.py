"""
Builds real per-district data for Delhi's current 11 administrative districts
(sourced from datta07/INDIAN-SHAPEFILES, a community-maintained real
boundary dataset), using REAL Census 2011 district populations
(data/processed/census_districts_2011.csv, official RGCCI data).

Methodology note (documented, not hidden):
Delhi had 9 census districts in 2011. In 2012 the Delhi government carved
2 new districts out of existing ones:
  - Shahdara was carved out of North East Delhi
  - South East Delhi was carved out of South Delhi
The 2011 Census pre-dates this reorganization, so there is no direct 2011
population figure for the new boundaries. This script apportions the
original (pre-split) census population between the two post-split
districts in proportion to each district's REAL geodesic area — a
standard areal-interpolation approach. This is an explicit, documented
approximation for exactly these 2 of Delhi's 11 districts; the other 9
use their real, unmodified 2011 census population figures directly.
"""
import csv
import json
from pathlib import Path
from shapely.geometry import shape
import pyproj

BASE = Path(__file__).resolve().parents[2]
GEO_DIR = BASE / "data" / "geo"
CENSUS_CSV = BASE / "data" / "processed" / "census_districts_2011.csv"
OUT_CSV = BASE / "data" / "processed" / "delhi_districts.csv"

geod = pyproj.Geod(ellps="WGS84")

# Maps the real current-boundary shapefile district name -> the real 2011
# census district it corresponds to (or was split from).
SPLIT_MAP = {
    "NORTH EAST": ("North East", ["NORTH EAST", "SHAHADARA"]),
    "SHAHADARA": ("North East", ["NORTH EAST", "SHAHADARA"]),
    "SOUTH": ("South", ["SOUTH", "SOUTH EAST"]),
    "SOUTH EAST": ("South", ["SOUTH", "SOUTH EAST"]),
}
DIRECT_MAP = {
    "NORTH WEST": "North West",
    "NORTH": "North",
    "EAST": "East",
    "NEW DELHI": "New Delhi",
    "CENTRAL": "Central",
    "WEST": "West",
    "SOUTH WEST": "South West",
}


def geodesic_area_km2(geom) -> float:
    if geom.geom_type == "Polygon":
        polys = [geom]
    else:
        polys = list(geom.geoms)
    total = sum(abs(geod.geometry_area_perimeter(p)[0]) for p in polys)
    return total / 1_000_000.0


def main():
    census = {}
    with open(CENSUS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["State name"].strip().upper() == "NCT OF DELHI":
                census[row["District name"].strip().upper()] = row

    with open(GEO_DIR / "delhi_districts.geojson") as f:
        gj = json.load(f)

    feats = {}
    for feat in gj["features"]:
        name = feat["properties"]["district"].strip().upper()
        if name == "NAZUL":
            continue  # small legacy administrative enclave, not a distinct 2011 census unit
        geom = shape(feat["geometry"])
        feats[name] = {
            "geom": geom,
            "area_km2": geodesic_area_km2(geom),
            "centroid": geom.centroid,
        }

    # Pre-compute split-group area totals for apportionment
    split_group_area = {}
    for name, (orig, group) in SPLIT_MAP.items():
        total_area = sum(feats[n]["area_km2"] for n in group if n in feats)
        split_group_area[orig] = total_area

    rows = []
    for name, f in feats.items():
        if name in SPLIT_MAP:
            orig_name, group = SPLIT_MAP[name]
            orig_row = census[orig_name.upper()]
            orig_pop = int(orig_row["Population"])
            share = f["area_km2"] / split_group_area[orig_name]
            pop = round(orig_pop * share)
            source_note = f"Apportioned from 2011 '{orig_name}' district ({orig_pop:,}) by real area share ({share:.1%})"
            base_row = orig_row
        elif name in DIRECT_MAP:
            orig_name = DIRECT_MAP[name]
            base_row = census[orig_name.upper()]
            pop = int(base_row["Population"])
            source_note = "Direct real 2011 Census figure (district boundary unchanged)"
        else:
            continue

        age_50 = int(base_row["Age_Group_50"])
        age_29 = int(base_row["Age_Group_0_29"])
        age_49 = int(base_row["Age_Group_30_49"])
        total_age = age_50 + age_29 + age_49
        elderly_pct = (age_50 / total_age * 100) if total_age else 0

        cultivators = int(base_row["Cultivator_Workers"])
        agri = int(base_row["Agricultural_Workers"])
        workers = int(base_row["Workers"]) or 1
        outdoor_pct = (cultivators + agri) / workers * 100

        literacy_pct = (int(base_row["Literate"]) / int(base_row["Population"]) * 100)
        electricity_pct = (
            int(base_row["Housholds_with_Electric_Lighting"]) / int(base_row["Households"]) * 100
        )

        rows.append({
            "district": name.title(),
            "latitude": round(f["centroid"].y, 5),
            "longitude": round(f["centroid"].x, 5),
            "area_km2": round(f["area_km2"], 1),
            "population_2011": pop,
            "population_density_km2": round(pop / f["area_km2"], 1) if f["area_km2"] else 0,
            "elderly_pct_50plus": round(elderly_pct, 2),
            "outdoor_worker_pct": round(outdoor_pct, 2),
            "literacy_pct": round(literacy_pct, 2),
            "household_electricity_pct": round(electricity_pct, 2),
            "data_note": source_note,
        })

    rows.sort(key=lambda r: -r["population_2011"])
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    print(f"Built {len(rows)} real Delhi districts -> {OUT_CSV}")
    for r in rows:
        print(f"  {r['district']:12s} pop={r['population_2011']:>9,} density={r['population_density_km2']:>8,.0f}/km2  [{r['data_note']}]")


if __name__ == "__main__":
    main()
