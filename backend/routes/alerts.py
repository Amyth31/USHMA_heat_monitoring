import os
from flask import Blueprint, jsonify, request
from alerts.alert_service import create_alert, list_alerts, get_alert, resolve_alert, NotAuthorized
from services.decision_support import generate_recommendations
from routes.risk import _build_overview

bp = Blueprint("alerts", __name__)

# Dev-only shared passcode for the prototype's authority gate. A real
# deployment replaces this with per-user government accounts (SSO) — see
# docs/deployment.md and docs/data_limitations.md.
AUTHORITY_PASSCODE = os.environ.get("AUTHORITY_PASSCODE", "ushma-authority-2026")


def _check_authority() -> bool:
    provided = request.headers.get("X-Authority-Key", "")
    return bool(provided) and provided == AUTHORITY_PASSCODE


@bp.get("")
def get_alerts():
    """Public read access — no authority key required to view alerts."""
    status = request.args.get("status")
    risk_level = request.args.get("risk_level")
    return jsonify({"alerts": list_alerts(status=status, risk_level=risk_level)})


@bp.get("/<alert_id>")
def get_one(alert_id):
    a = get_alert(alert_id)
    if not a:
        return jsonify({"error": "not_found"}), 404
    return jsonify(a)


@bp.post("/verify-key")
def verify_key():
    """
    Lets the frontend check a key before switching the UI into authority
    mode, instead of unlocking on any non-empty string client-side and
    only discovering it's wrong at the moment of issuing a real alert.
    """
    if not _check_authority():
        return jsonify({"error": "not_authorized", "message": "Invalid authority key."}), 403
    return jsonify({"ok": True})


@bp.post("")
def create_from_location():
    """
    Generates an alert from a location's LIVE risk pipeline — never a
    forced historical demo event, so the risk level reflects real current
    (or, if explicitly requested via demo, a real historical) conditions,
    not an artificially extreme default.

    Requires a valid X-Authority-Key header — this is restricted to
    disaster-management authorities, not open to any visitor searching a
    city. See alerts/alert_service.py for the full two-layer explanation.
    """
    if not _check_authority():
        return jsonify({
            "error": "not_authorized",
            "message": "Issuing an alert requires disaster-management authority credentials. "
                       "This location's current risk data is still visible on the dashboard.",
        }), 403

    body = request.get_json(silent=True) or {}
    location_id = body.get("location_id") or request.args.get("location_id")
    demo = body.get("demo") or request.args.get("demo")  # explicit opt-in only, never assumed
    if not location_id:
        return jsonify({"error": "bad_request", "message": "location_id required"}), 400

    overview, err = _build_overview(location_id, demo_event_key=demo)
    if err:
        return jsonify(err), 400

    recs = generate_recommendations(
        thermal_stress_score=overview["thermal_stress"]["score"],
        thermal_stress_category=overview["thermal_stress"]["category"],
        heatwave_status=overview["heatwave"]["overall_status"],
        mortality_risk_category=overview["health_risk"]["mortality_risk_category"],
        hospitalization_risk_category=overview["health_risk"]["hospitalization_risk_category"],
        vulnerability_category=(overview["vulnerability"] or {}).get("category", "LOW"),
    )
    top = recs[0]
    try:
        alert = create_alert(
            location_id=location_id,
            location_name=overview["location"]["name"],
            risk_level=top.risk_level,
            trigger=top.trigger,
            expected_duration_days=overview["heatwave"].get("consecutive_severe_days") or None,
            actions=[r.action for r in recs],
            is_authority=True,  # already verified above
        )
    except NotAuthorized as e:
        return jsonify({"error": "not_authorized", "message": str(e)}), 403
    return jsonify(alert), 201


@bp.post("/<alert_id>/resolve")
def resolve(alert_id):
    if not _check_authority():
        return jsonify({
            "error": "not_authorized",
            "message": "Resolving an alert requires disaster-management authority credentials.",
        }), 403
    try:
        a = resolve_alert(alert_id, is_authority=True)
    except NotAuthorized as e:
        return jsonify({"error": "not_authorized", "message": str(e)}), 403
    if not a:
        return jsonify({"error": "not_found"}), 404
    return jsonify(a)


@bp.get("/recommendations")
def recommendations_route():
    """
    Public — anyone can see what recommendations a location's real current
    risk data would produce, without needing authority credentials. Only
    actually issuing/persisting an alert is restricted.
    """
    location_id = request.args.get("location_id")
    demo = request.args.get("demo")
    if not location_id:
        return jsonify({"error": "bad_request", "message": "location_id required"}), 400
    overview, err = _build_overview(location_id, demo_event_key=demo)
    if err:
        return jsonify(err), 400
    recs = generate_recommendations(
        thermal_stress_score=overview["thermal_stress"]["score"],
        thermal_stress_category=overview["thermal_stress"]["category"],
        heatwave_status=overview["heatwave"]["overall_status"],
        mortality_risk_category=overview["health_risk"]["mortality_risk_category"],
        hospitalization_risk_category=overview["health_risk"]["hospitalization_risk_category"],
        vulnerability_category=(overview["vulnerability"] or {}).get("category", "LOW"),
    )
    return jsonify({"location_id": location_id, "recommendations": [r.__dict__ for r in recs]})
