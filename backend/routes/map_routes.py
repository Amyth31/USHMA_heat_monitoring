import json
from pathlib import Path
from flask import Blueprint, jsonify, request
from services.location_service import list_locations
from services.vulnerability_engine import vulnerability_score

bp = Blueprint("map", __name__)

BASE = Path(__file__).resolve().parents[1]
GEO_DIR = BASE.parent / "data" / "geo"


@bp.get("/delhi-districts")
def delhi_districts_geojson():
    """Real 11-district Delhi boundary GeoJSON, annotated with real vulnerability."""
    path = GEO_DIR / "delhi_districts.geojson"
    if not path.exists():
        return jsonify({"error": "not_found"}), 404
    gj = json.loads(path.read_text())
    for feat in gj["features"]:
        name = feat["properties"].get("district", "")
        if name.upper() == "NAZUL":
            continue
        v = vulnerability_score("Delhi", name)
        if v:
            feat["properties"]["vulnerability_score"] = v.score
            feat["properties"]["vulnerability_category"] = v.category
    return jsonify(gj)


@bp.get("/india-districts")
def india_districts_geojson():
    """Real all-India district boundaries (760 features), annotated with real vulnerability."""
    from services.vulnerability_engine import vulnerability_score
    path = GEO_DIR / "india_states.geojson"
    if not path.exists():
        return jsonify({"error": "not_found"}), 404
    gj = json.loads(path.read_text())

    # The source file bundles two kinds of polygons: ~726 real district
    # boundaries (have a "district" property) and, appended at the end,
    # one whole-state outline per state with no "district" property at
    # all. Those state outlines sit on top of every district in that
    # state (they're drawn last) and have no vulnerability data, which
    # visually blanks out most of the country and breaks click/hover.
    # Drop them here so only real district polygons are served.
    district_features = [f for f in gj["features"] if f["properties"].get("district")]

    for feat in district_features:
        props = feat["properties"]
        state = props.get("st_nm")
        district = props.get("district")
        v = vulnerability_score(state, district)
        if v:
            props["vulnerability_score"] = v.score
            props["vulnerability_category"] = v.category
            props["state"] = state

    gj["features"] = district_features
    return jsonify(gj)


@bp.get("/world-countries")
def world_countries_geojson():
    """Real Natural Earth country boundaries (242 features), annotated with real World Bank vulnerability."""
    from services.global_vulnerability_service import vulnerability_score_for_country
    path = GEO_DIR / "world_countries.geojson"
    if not path.exists():
        return jsonify({"error": "not_found"}), 404
    gj = json.loads(path.read_text())
    for feat in gj["features"]:
        iso3 = feat["properties"].get("ISO_A3")
        if not iso3 or iso3 == "-99":
            continue
        v = vulnerability_score_for_country(iso3)
        if v:
            feat["properties"]["vulnerability_score"] = v.score
            feat["properties"]["vulnerability_category"] = v.category
    return jsonify(gj)


@bp.get("/risk-layer")
def risk_layer():
    """Location markers with real vulnerability scores for map overlay."""
    state = request.args.get("state")
    locs = list_locations(state=state)[:200]  # cap for payload size
    features = []
    for l in locs:
        v = vulnerability_score(l.state, l.district)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [l.longitude, l.latitude]},
            "properties": {
                "location_id": l.location_id,
                "name": l.name,
                "state": l.state,
                "population_2011": l.population,
                "vulnerability_score": v.score if v else None,
                "vulnerability_category": v.category if v else None,
            },
        })
    return jsonify({"type": "FeatureCollection", "features": features})
