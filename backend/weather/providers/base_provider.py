"""
Abstract weather provider interface.
Any real data source (NCMRWF, IMD, satellite reanalysis) can be plugged in
later by implementing this interface — no other part of the app changes.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List


@dataclass
class WeatherObservation:
    location_id: str
    location_name: str
    latitude: float
    longitude: float
    timestamp: str          # ISO 8601
    temperature_c: float
    relative_humidity_pct: float
    wind_speed_ms: float
    solar_radiation_wm2: float
    pressure_hpa: float
    dew_point_c: float
    source: str              # "SYNTHETIC" | "LIVE:<provider-name>"


class WeatherProvider(ABC):
    @abstractmethod
    def get_current(self, location_id: str) -> WeatherObservation:
        ...

    @abstractmethod
    def get_forecast(self, location_id: str, days: int = 5) -> List[WeatherObservation]:
        ...

    @abstractmethod
    def list_locations(self) -> list:
        ...
