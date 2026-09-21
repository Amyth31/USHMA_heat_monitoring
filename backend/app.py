import os
from flask import Flask, jsonify
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)

    from routes.locations import bp as locations_bp
    from routes.weather import bp as weather_bp
    from routes.thermal import bp as thermal_bp
    from routes.vulnerability import bp as vulnerability_bp
    from routes.risk import bp as risk_bp
    from routes.map_routes import bp as map_bp
    from routes.alerts import bp as alerts_bp
    from routes.analytics import bp as analytics_bp

    app.register_blueprint(locations_bp, url_prefix="/api/locations")
    app.register_blueprint(weather_bp, url_prefix="/api/weather")
    app.register_blueprint(thermal_bp, url_prefix="/api/thermal")
    app.register_blueprint(vulnerability_bp, url_prefix="/api/vulnerability")
    app.register_blueprint(risk_bp, url_prefix="/api/risk")
    app.register_blueprint(map_bp, url_prefix="/api/map")
    app.register_blueprint(alerts_bp, url_prefix="/api/alerts")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "USHMA backend"})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "not_found", "message": str(e)}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "server_error", "message": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
