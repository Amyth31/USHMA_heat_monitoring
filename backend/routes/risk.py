from flask import Blueprint, jsonify, request
from thermal.indices import heat_index, wbgt, utci, human_thermal_stress_score
from services.vulnerability_engine import vulnerability_score
from services.global_vulnerability_service import vulnerability_score_for_country
from services.location_service import get_location
from services.weather_service import get_current_weather, get_forecast
from services.heatwave_engine import classify_sequence
from services.global_heatwave_engine import classify_sequence_global
from ml.health_risk_engine import estimate_health_risk
from weather.providers.demo_events import get_demo_event
from datetime import datetime

bp = Blueprint("risk", __name__)


def _build_overview(location_id: str, demo_event_key: str = None):
    loc = get_location(location_id)
    if not loc:
        return None, {"error": "not_found", "message": f"No location '{location_id}'"}

    if demo_event_key:
        event = get_demo_event(demo_event_key)
        if not event:
            return None, {"error": "not_found", "message": f"No demo event '{demo_event_key}'"}
        weather = {
            "status": "DEMO_HISTORICAL_EVENT",
            "location_id": location_id,
            "location_name": loc.name,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "timestamp": event["date"],
            "temperature_c": event["temperature_c"],
            "relative_humidity_pct": event["relative_humidity_pct"],
            "wind_speed_ms": event["wind_speed_ms"],
            "solar_radiation_wm2": event["solar_radiation_wm2"],
            "pressure_hpa": 1000.0,
            "dew_point_c": None,
            "source": f"REAL_HISTORICAL_EVENT: {event['label']} — {event['source']}",
        }
        daily_tmax_override = [event["temperature_c"]] * 3 + [event["temperature_c"] - 1, event["temperature_c"] - 2]
    else:
        weather = get_current_weather(location_id)
        daily_tmax_override = None
        if weather.get("status") == "UNAVAILABLE":
            return None, {"error": "weather_unavailable", "message": weather.get("message")}

    v = vulnerability_score(loc.state, loc.district)
    vuln_score = v.score if v else 0.0
    is_global = loc.granularity == "world_country"

    if is_global:
        gv = vulnerability_score_for_country(loc.iso3)
        if gv:
            vuln_score = gv.score
            v = gv

    hi = heat_index(weather["temperature_c"], weather["relative_humidity_pct"])
    w = wbgt(weather["temperature_c"], weather["relative_humidity_pct"],
             weather["solar_radiation_wm2"], weather["wind_speed_ms"])
    u = utci(weather["temperature_c"], weather["relative_humidity_pct"],
             weather["wind_speed_ms"], weather["solar_radiation_wm2"])
    stress = human_thermal_stress_score(
        weather["temperature_c"], weather["relative_humidity_pct"],
        weather["wind_speed_ms"], weather["solar_radiation_wm2"],
        hi.heat_index_c, w.wbgt_c, vulnerability_score=vuln_score, exposure_hours=4.0,
    )

    fc = get_forecast(location_id, days=5)
    daily_tmax = daily_tmax_override or [d["temperature_c"] for d in fc.get("forecast", [])] or [weather["temperature_c"]]

    if is_global:
        month = datetime.utcnow().month
        hw = classify_sequence_global(loc.latitude, loc.longitude, daily_tmax, month)
    else:
        hw = classify_sequence(loc.state, daily_tmax)

    health = estimate_health_risk(
        temp_c=weather["temperature_c"],
        heatwave_active=hw["overall_status"] in ("SEVERE", "EXTREME"),
        heatwave_duration_days=hw["consecutive_severe_days"] or 1,
        vulnerability_score=vuln_score,
        thermal_stress_score=stress.score,
        has_heat_action_plan=not is_global,  # only India's real HAP-covered locations assume active intervention
    )
    if is_global:
        health.methodology_note += (
            " NOTE: this relative-risk curve is calibrated on Indian mortality data "
            "(Ahmedabad HAP study) and applied here as a general approximation for a "
            "non-Indian location — no equivalent published study for this country was "
            "available to this prototype. Treat as directional, not location-specific."
        )

    overview = {
        "location": {
            "location_id": loc.location_id, "name": loc.name,
            "state": loc.state, "district": loc.district,
        },
        "weather": weather,
        "heat_index": hi.__dict__,
        "wbgt": w.__dict__,
        "utci": u.__dict__,
        "thermal_stress": stress.__dict__,
        "vulnerability": v.__dict__ if v else None,
        "heatwave": hw,
        "health_risk": health.__dict__,
    }
    return overview, None


@bp.get("/overview")
def overview_route():
    location_id = request.args.get("location_id")
    demo = request.args.get("demo")
    if not location_id:
        return jsonify({"error": "bad_request", "message": "location_id query param required"}), 400
    overview, err = _build_overview(location_id, demo_event_key=demo)
    if err:
        return jsonify(err), 400
    return jsonify(overview)


@bp.get("/demo-events")
def demo_events_route():
    from weather.providers.demo_events import list_demo_events
    return jsonify({"events": list_demo_events()})


@bp.get("/mortality")
def mortality_route():
    overview, err = _build_overview(request.args.get("location_id", ""))
    if err:
        return jsonify(err), 400
    return jsonify(overview["health_risk"])


@bp.get("/hospitalization")
def hospitalization_route():
    overview, err = _build_overview(request.args.get("location_id", ""))
    if err:
        return jsonify(err), 400
    return jsonify(overview["health_risk"])
