"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { api, RiskOverview } from "@/lib/api";
import TopNav from "@/components/TopNav";
import RiskBadge from "@/components/RiskBadge";
import { PanelSkeleton } from "@/components/Skeleton";

const GlobalRiskMap = dynamic(() => import("@/components/GlobalRiskMap"), { ssr: false });

export default function RiskMapPage() {
  const [mode, setMode] = useState<"vulnerability" | "population">("vulnerability");
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelectRegion(info: { name: string; locationHint: string }) {
    setLoading(true);
    setError(null);
    try {
      const results = await api.searchLocations(info.name);
      const match =
        results.results.find((r) => r.name === info.name) ||
        results.results.find((r) => r.state === info.locationHint) ||
        results.results[0];
      if (!match) {
        setError(`No real data available yet for "${info.name}".`);
        return;
      }
      // Live weather by default — a demo event is never assumed just because
      // a region was clicked; the risk level reflects real current conditions.
      const ov = await api.getRiskOverview(match.location_id);
      setOverview(ov);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Risk Map</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Zoom in for real district-level detail — India and Delhi resolve automatically as you get closer.
            </p>
          </div>
          <div className="flex gap-2">
            {(["vulnerability", "population"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="text-xs px-3 py-1.5 rounded-[var(--radius-sm)] border capitalize"
                style={{
                  borderColor: "var(--border-hairline-strong)",
                  background: mode === m ? "var(--accent)" : "var(--bg-panel)",
                  color: mode === m ? "var(--bg-void)" : "var(--text-secondary)",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-sm p-4 rounded-[var(--radius-sm)] border mb-4" style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}>
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div
            className="rounded-[var(--radius-md)] border overflow-hidden"
            style={{ height: "660px", borderColor: "var(--border-hairline)" }}
          >
            <GlobalRiskMap mode={mode} onSelectRegion={handleSelectRegion} />
          </div>

          <div
            className="rounded-[var(--radius-md)] border p-6"
            style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)" }}
          >
            {!overview && !loading && (
              <p className="text-sm text-[var(--text-secondary)]">
                Click a region on the map to see its current conditions, thermal stress,
                health risk, vulnerability and recommended actions — all live.
              </p>
            )}
            {loading && <PanelSkeleton height="380px" />}
            {overview && !loading && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-medium mb-1">{overview.location.name}</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">{overview.weather.source}</p>
                </div>
                <div className="flex gap-4">
                  <Stat label="Temp" value={`${overview.weather.temperature_c.toFixed(1)}°C`} />
                  <Stat label="RH" value={`${overview.weather.relative_humidity_pct}%`} />
                  <Stat label="WBGT" value={`${overview.wbgt.wbgt_c.toFixed(1)}°C`} />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">Thermal Stress</div>
                  <div className="flex items-center gap-2">
                    <span className="font-data text-3xl">{overview.thermal_stress.score.toFixed(0)}</span>
                    <RiskBadge category={overview.thermal_stress.category} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">Mortality Risk</div>
                  <div className="flex items-center gap-2">
                    <span className="font-data">{overview.health_risk.mortality_relative_risk}×</span>
                    <RiskBadge category={overview.health_risk.mortality_risk_category} />
                  </div>
                </div>
                {overview.vulnerability && (
                  <div>
                    <div className="text-xs text-[var(--text-tertiary)] mb-1">Vulnerability</div>
                    <div className="flex items-center gap-2">
                      <span className="font-data">{overview.vulnerability.score.toFixed(0)}</span>
                      <RiskBadge category={overview.vulnerability.category} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
      <div className="font-data text-sm">{value}</div>
    </div>
  );
}
