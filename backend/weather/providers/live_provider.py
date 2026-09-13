"""
Live weather provider — pulls REAL current & forecast weather from
Open-Meteo (https://open-meteo.com), a free, no-API-key weather service
that blends national weather-model output (including India-relevant
global models). Data is real, not synthetic.

Attribution requirement (CC BY 4.0): "Weather data by Open-Meteo.com".

This is the DEFAULT provider for USHMA. If Open-Meteo is unreachable
(no internet, rate-limited), the app falls back to the last cached
observation and clearly marks data as "STALE / CACHED", never fabricating
new numbers silently.
"""
from __future__ import annotations
import requests
from datetime import datetime, timezone
from typing import List

from .base_provider import WeatherProvider, WeatherObservation

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

HOURLY_VARS = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "shortwave_radiation",
    "surface_pressure",
    "dew_point_2m",
]


class OpenMeteoProvider(WeatherProvider):
    """Real live weather data. Source: Open-Meteo (open-data weather models)."""

    def __init__(self, locations: dict):
        """
        locations: {location_id: {"name":..., "lat":..., "lon":...}, ...}
        """
        self.locations = locations

    def _fetch(self, lat: float, lon: float, forecast_days: int = 5) -> dict:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": ",".join(HOURLY_VARS),
            "timezone": "Asia/Kolkata",
            "forecast_days": forecast_days,
        }
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_current(self, location_id: str) -> WeatherObservation:
        loc = self.locations[location_id]
        data = self._fetch(loc["lat"], loc["lon"], forecast_days=1)
        hourly = data["hourly"]
        # nearest hour to now (IST)
        now_iso = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%dT%H:00")
        try:
            idx = hourly["time"].index(now_iso)
        except ValueError:
            idx = 0

        return WeatherObservation(
            location_id=location_id,
            location_name=loc["name"],
            latitude=loc["lat"],
            longitude=loc["lon"],
            timestamp=hourly["time"][idx],
            temperature_c=hourly["temperature_2m"][idx],
            relative_humidity_pct=hourly["relative_humidity_2m"][idx],
            wind_speed_ms=round(hourly["wind_speed_10m"][idx] / 3.6, 2),  # km/h -> m/s
            solar_radiation_wm2=hourly["shortwave_radiation"][idx],
            pressure_hpa=hourly["surface_pressure"][idx],
            dew_point_c=hourly["dew_point_2m"][idx],
            source="LIVE:open-meteo",
        )

    def get_forecast(self, location_id: str, days: int = 5) -> List[WeatherObservation]:
        loc = self.locations[location_id]
        data = self._fetch(loc["lat"], loc["lon"], forecast_days=days)
        hourly = data["hourly"]

        # Reduce to daily peak-heat (14:00 local) observation per day for the
        # thermal-stress pipeline, since that's when heat stress typically peaks.
        obs = []
        seen_dates = set()
        for i, t in enumerate(hourly["time"]):
            date_part, hour_part = t.split("T")
            if hour_part == "14:00" and date_part not in seen_dates:
                seen_dates.add(date_part)
                obs.append(WeatherObservation(
                    location_id=location_id,
                    location_name=loc["name"],
                    latitude=loc["lat"],
                    longitude=loc["lon"],
                    timestamp=t,
                    temperature_c=hourly["temperature_2m"][i],
                    relative_humidity_pct=hourly["relative_humidity_2m"][i],
                    wind_speed_ms=round(hourly["wind_speed_10m"][i] / 3.6, 2),
                    solar_radiation_wm2=hourly["shortwave_radiation"][i],
                    pressure_hpa=hourly["surface_pressure"][i],
                    dew_point_c=hourly["dew_point_2m"][i],
                    source="LIVE:open-meteo",
                ))
            if len(obs) >= days:
                break
        return obs

    def list_locations(self) -> list:
        return [
            {"location_id": k, "name": v["name"], "lat": v["lat"], "lon": v["lon"]}
            for k, v in self.locations.items()
        ]
