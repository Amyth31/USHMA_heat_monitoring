from flask import Blueprint, jsonify, request
from thermal.indices import heat_index, wbgt, utci, human_thermal_stress_score
from services.vulnerability_engine import vulnerability_score
from services.location_service import get_location
from services.weather_service import get_current_weather

bp = Blueprint("thermal", __name__)


def _parse_manual_inputs():
    temp = request.args.get("temperature_c", type=float)
    rh = request.args.get("relative_humidity_pct", type=float)
    wind = request.args.get("wind_ms", type=float, default=1.5)
    solar = request.args.get("solar_radiation_wm2", type=float, default=600.0)
    return temp, rh, wind, solar


def _resolve_inputs():
    """
    Resolve temp/rh/wind/solar either from explicit query params, or by
    fetching real live weather for a given location_id.
    """
    temp, rh, wind, solar = _parse_manual_inputs()
    if temp is not None and rh is not None:
        return temp, rh, wind, solar, None

    location_id = request.args.get("location_id")
    if not location_id:
        return None, None, None, None, {"error": "bad_request", "message": "Provide location_id, or temperature_c & relative_humidity_pct"}

    weather = get_current_weather(location_id)
    if weather.get("status") == "UNAVAILABLE":
        return None, None, None, None, {"error": "weather_unavailable", "message": weather.get("message")}

    return (
        weather["temperature_c"], weather["relative_humidity_pct"],
        weather["wind_speed_ms"], weather["solar_radiation_wm2"], None
    )


@bp.get("/heat-index")
def heat_index_route():
    temp, rh, wind, solar, err = _resolve_inputs()
    if err:
        return jsonify(err), 400
    return jsonify(heat_index(temp, rh).__dict__)


@bp.get("/wbgt")
def wbgt_route():
    temp, rh, wind, solar, err = _resolve_inputs()
    if err:
        return jsonify(err), 400
    return jsonify(wbgt(temp, rh, solar, wind).__dict__)


@bp.get("/utci")
def utci_route():
    temp, rh, wind, solar, err = _resolve_inputs()
    if err:
        return jsonify(err), 400
    return jsonify(utci(temp, rh, wind, solar).__dict__)


@bp.get("/stress")
def stress_route():
    temp, rh, wind, solar, err = _resolve_inputs()
    if err:
        return jsonify(err), 400

    hi = heat_index(temp, rh)
    w = wbgt(temp, rh, solar, wind)

    vuln = 0.0
    location_id = request.args.get("location_id")
    if location_id:
        loc = get_location(location_id)
        if loc:
            v = vulnerability_score(loc.state, loc.district)
            if v:
                vuln = v.score

    exposure = request.args.get("exposure_hours", type=float, default=4.0)
    result = human_thermal_stress_score(
        temp, rh, wind, solar, hi.heat_index_c, w.wbgt_c,
        vulnerability_score=vuln, exposure_hours=exposure,
    )
    return jsonify({
        **result.__dict__,
        "heat_index": hi.__dict__,
        "wbgt": w.__dict__,
    })
