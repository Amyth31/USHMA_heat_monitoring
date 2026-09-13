from flask import Blueprint, jsonify, request
from services.location_service import list_locations
from services.vulnerability_engine import vulnerability_score
from weather.providers.demo_events import list_demo_events

bp = Blueprint("analytics", __name__)


@bp.get("/historical-events")
def historical_events():
    """Real documented historical extreme-heat events for comparison charts."""
    return jsonify({"events": list_demo_events()})


@bp.get("/top-vulnerable-districts")
def top_vulnerable_districts():
    """
    Real Census-2011-derived vulnerability ranking across all matched Indian
    districts. Computed live from the same vulnerability engine the risk
    pipeline uses — not a separate/fabricated dataset.
    """
    limit = int(request.args.get("limit", 10))
    state = request.args.get("state")
    locs = list_locations(state=state)
    india_locs = [l for l in locs if l.granularity in ("district", "delhi_subdistrict")]

    scored = []
    for l in india_locs:
        v = vulnerability_score(l.state, l.district)
        if v:
            scored.append({
                "location_id": l.location_id,
                "name": l.name,
                "state": l.state,
                "population_2011": l.population,
                "vulnerability_score": v.score,
                "vulnerability_category": v.category,
            })

    scored.sort(key=lambda r: -r["vulnerability_score"])
    return jsonify({"count": len(scored), "districts": scored[:limit]})


@bp.get("/vulnerability-distribution")
def vulnerability_distribution():
    """
    Real distribution of vulnerability scores across all matched Indian
    districts, bucketed by category — for a category breakdown chart.
    """
    locs = [l for l in list_locations() if l.granularity in ("district", "delhi_subdistrict")]
    buckets = {"LOW": 0, "MODERATE": 0, "ELEVATED": 0, "HIGH": 0, "SEVERE": 0}
    for l in locs:
        v = vulnerability_score(l.state, l.district)
        if v and v.category in buckets:
            buckets[v.category] += 1
    return jsonify({"total_districts": sum(buckets.values()), "distribution": buckets})
