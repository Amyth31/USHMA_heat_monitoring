"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import LocationSearch from "@/components/LocationSearch";
import ForecastChart from "@/components/ForecastChart";
import { PanelSkeleton } from "@/components/Skeleton";
import { api, Location, ForecastDay } from "@/lib/api";
import { heatIndexC, wbgtC, thermalStressScore } from "@/lib/thermal-client";

export default function ForecastPage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [days, setDays] = useState<ForecastDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .searchLocations("North West Delhi")
      .then((r) => r.results[0] && setLocation(r.results[0]))
      .catch(() => setError("Cannot reach USHMA backend at localhost:5000."));
  }, []);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    api
      .getForecast(location.location_id, 5)
      .then((r) => {
        if (r.status === "UNAVAILABLE") {
          setError("Live forecast unavailable — this needs network access to Open-Meteo.");
          setDays([]);
        } else {
          setDays(r.forecast);
          setError(null);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location]);

  const computed = days.map((d) => {
    const hi = heatIndexC(d.temperature_c, d.relative_humidity_pct);
    const wbgt = wbgtC(d.temperature_c, d.relative_humidity_pct, d.solar_radiation_wm2, d.wind_speed_ms);
    const stress = thermalStressScore(d.temperature_c, d.relative_humidity_pct, d.wind_speed_ms, d.solar_radiation_wm2, hi.value, wbgt);
    return {
      day: new Date(d.timestamp).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      temperature: Math.round(d.temperature_c * 10) / 10,
      wbgt: Math.round(wbgt * 10) / 10,
      stress: stress.score,
      humidity: d.relative_humidity_pct,
      wind: d.wind_speed_ms,
    };
  });

  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-semibold mb-1">5-day Forecast</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {location ? `${location.name}, ${location.state}` : "Select a location"}
            </p>
          </div>
          <LocationSearch onSelect={setLocation} />
        </div>

        {error && (
          <div className="text-sm p-4 rounded-[var(--radius-sm)] border mb-6" style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}>
            {error}
          </div>
        )}

        {loading && <PanelSkeleton height="340px" />}

        {!loading && computed.length > 0 && (
          <>
            <div
              className="rounded-[var(--radius-md)] border p-6 mb-6"
              style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)" }}
            >
              <ForecastChart data={computed} />
            </div>

            <div className="grid md:grid-cols-5 gap-px" style={{ background: "var(--border-hairline)" }}>
              {computed.map((d, i) => (
                <div key={i} className="p-5 transition-colors duration-200 hover:bg-[var(--bg-panel-raised)]" style={{ background: "var(--bg-panel)" }}>
                  <div className="text-xs text-[var(--text-tertiary)] mb-3">{d.day}</div>
                  <div className="font-data text-2xl mb-3">{d.temperature.toFixed(1)}°C</div>
                  <div className="text-xs text-[var(--text-secondary)] space-y-1">
                    <div>RH {d.humidity.toFixed(0)}%</div>
                    <div>WBGT {d.wbgt.toFixed(1)}°C</div>
                    <div>Stress {d.stress.toFixed(0)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}