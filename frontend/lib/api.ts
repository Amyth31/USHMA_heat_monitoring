const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface Location {
  location_id: string;
  name: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  population_2011: number;
  area_km2: number;
  granularity: string;
}

export interface RiskOverview {
  location: { location_id: string; name: string; state: string; district: string };
  weather: {
    status: string;
    temperature_c: number;
    relative_humidity_pct: number;
    wind_speed_ms: number;
    solar_radiation_wm2: number;
    source: string;
    timestamp: string;
  };
  heat_index: { heat_index_c: number; extrapolated: boolean; notes: string };
  wbgt: { wbgt_c: number; wbgt_indoor_shade_c: number };
  utci: { utci_c: number; stress_category: string };
  thermal_stress: {
    score: number;
    category: string;
    contributions: Record<string, number>;
    formula: string;
  };
  vulnerability: {
    score: number;
    category: string;
    contributions: Record<string, number>;
    inputs: Record<string, number>;
    data_source: string;
  } | null;
  heatwave: {
    overall_status: string;
    confirmed_multiday_heatwave: boolean;
    consecutive_severe_days: number;
    daily_breakdown: Array<{ status: string; departure_from_normal_c: number }>;
  };
  health_risk: {
    mortality_relative_risk: number;
    mortality_risk_category: string;
    hospitalization_relative_risk: number;
    hospitalization_risk_category: string;
    methodology_note: string;
    explanation?: Record<string, number | string | boolean>;
  };
}

export interface Recommendation {
  trigger: string;
  risk_level: string;
  reason: string;
  action: string;
  category: string;
}

export interface DemoEvent {
  key: string;
  label: string;
  location_hint: string;
  date: string;
  temperature_c: number;
  source: string;
}

export interface ForecastDay {
  timestamp: string;
  temperature_c: number;
  relative_humidity_pct: number;
  wind_speed_ms: number;
  solar_radiation_wm2: number;
}

export const api = {
  searchLocations: (q: string) =>
    apiFetch<{ results: Location[] }>(`/locations/search?q=${encodeURIComponent(q)}&limit=15`),
  getLocation: (id: string) => apiFetch<Location>(`/locations/${id}`),
  getRiskOverview: (locationId: string, demo?: string) =>
    apiFetch<RiskOverview>(
      `/risk/overview?location_id=${locationId}${demo ? `&demo=${demo}` : ""}`
    ),
  getForecast: (locationId: string, days = 5) =>
    apiFetch<{ status: string; forecast: ForecastDay[] }>(
      `/weather/forecast?location_id=${locationId}&days=${days}`
    ),
  getRecommendations: (locationId: string, demo?: string) =>
    apiFetch<{ recommendations: Recommendation[] }>(
      `/alerts/recommendations?location_id=${locationId}${demo ? `&demo=${demo}` : ""}`
    ),
  getDemoEvents: () => apiFetch<{ events: DemoEvent[] }>(`/risk/demo-events`),
  getDelhiDistrictsGeoJSON: () => apiFetch<GeoJSON.FeatureCollection>(`/map/delhi-districts`),
  getIndiaDistrictsGeoJSON: () => apiFetch<GeoJSON.FeatureCollection>(`/map/india-districts`),
  getWorldCountriesGeoJSON: () => apiFetch<GeoJSON.FeatureCollection>(`/map/world-countries`),
  getHistoricalEvents: () => apiFetch<{ events: DemoEvent[] }>(`/analytics/historical-events`),
  getTopVulnerableDistricts: (limit = 10) =>
    apiFetch<{ count: number; districts: Array<{ name: string; state: string; population_2011: number; vulnerability_score: number; vulnerability_category: string }> }>(
      `/analytics/top-vulnerable-districts?limit=${limit}`
    ),
  getVulnerabilityDistribution: () =>
    apiFetch<{ total_districts: number; distribution: Record<string, number> }>(`/analytics/vulnerability-distribution`),
  getAlerts: () => apiFetch<{ alerts: any[] }>(`/alerts`),
  verifyAuthorityKey: async (authorityKey: string) => {
    const res = await fetch(`${API_BASE}/alerts/verify-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Authority-Key": authorityKey },
    });
    if (!res.ok) {
      const err: any = new Error("Invalid authority key");
      err.status = res.status;
      throw err;
    }
    return true;
  },
  createAlert: async (locationId: string, authorityKey: string, demo?: string) => {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Authority-Key": authorityKey },
      body: JSON.stringify({ location_id: locationId, demo }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err: any = new Error(body.message || "Failed to create alert");
      err.status = res.status;
      throw err;
    }
    return body;
  },
  resolveAlert: async (alertId: string, authorityKey: string) => {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
      method: "POST",
      headers: { "X-Authority-Key": authorityKey },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err: any = new Error(body.message || "Failed to resolve alert");
      err.status = res.status;
      throw err;
    }
    return body;
  },
};

export const RISK_COLORS: Record<string, string> = {
  SAFE: "var(--risk-safe)",
  LOW: "var(--risk-safe)",
  CAUTION: "var(--risk-caution)",
  MODERATE: "var(--risk-moderate)",
  ELEVATED: "var(--risk-moderate)",
  HIGH: "var(--risk-high)",
  SEVERE: "var(--risk-extreme)",
  EXTREME: "var(--risk-extreme)",
  NONE: "var(--risk-safe)",
  POTENTIAL: "var(--risk-caution)",
  DEVELOPING: "var(--risk-moderate)",
  RESOLVED: "var(--text-tertiary)",
};
