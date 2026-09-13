from flask import Blueprint, jsonify, request
from services.weather_service import get_current_weather, get_forecast

bp = Blueprint("weather", __name__)


@bp.get("/current")
def current():
    location_id = request.args.get("location_id")
    if not location_id:
        return jsonify({"error": "bad_request", "message": "location_id query param required"}), 400
    return jsonify(get_current_weather(location_id))


@bp.get("/forecast")
def forecast():
    location_id = request.args.get("location_id")
    days = int(request.args.get("days", 5))
    if not location_id:
        return jsonify({"error": "bad_request", "message": "location_id query param required"}), 400
    return jsonify(get_forecast(location_id, days=days))
