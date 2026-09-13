from flask import Blueprint, jsonify, request
from services.location_service import list_locations, search_locations, get_location

bp = Blueprint("locations", __name__)


def _loc_dict(l):
    return {
        "location_id": l.location_id,
        "name": l.name,
        "state": l.state,
        "district": l.district,
        "latitude": l.latitude,
        "longitude": l.longitude,
        "population_2011": l.population,
        "area_km2": l.area_km2,
        "granularity": l.granularity,
    }


@bp.get("")
def get_locations():
    state = request.args.get("state")
    locs = list_locations(state=state)
    return jsonify({"count": len(locs), "locations": [_loc_dict(l) for l in locs]})


@bp.get("/search")
def search():
    q = request.args.get("q", "")
    limit = int(request.args.get("limit", 10))
    results = search_locations(q, limit=limit)
    return jsonify({"query": q, "results": [_loc_dict(l) for l in results]})


@bp.get("/<location_id>")
def get_one(location_id):
    loc = get_location(location_id)
    if not loc:
        return jsonify({"error": "not_found", "message": f"No location '{location_id}'"}), 404
    return jsonify(_loc_dict(loc))
