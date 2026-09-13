"use client";

import TopNav from "@/components/TopNav";
import RiskBadge from "@/components/RiskBadge";
import LocationSearch from "@/components/LocationSearch";
import RiskGauge from "@/components/RiskGauge";
import { PanelSkeleton } from "@/components/Skeleton";
import { useRiskOverview } from "@/hooks/useRiskOverview";

export default function ThermalStressPage() {
  const { location, setLocation, overview, demoEvents, demoKey, setDemoKey, loading, error } =
    useRiskOverview();

  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-semibold mb-1">What makes heat dangerous?</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {location ? `${location.name}, ${location.state}` : "Select a location"}
            </p>
          </div>
          <div className="flex gap-3">
            <LocationSearch onSelect={setLocation} />
            <select
              value={demoKey || ""}
              onChange={(e) => setDemoKey(e.target.value || undefined)}
              className="text-sm px-3 py-2 rounded-[var(--radius-sm)] border"
              style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline-strong)" }}
            >
              <option value="">Live weather</option>
              {demoEvents.map((ev) => (
                <option key={ev.key} value={ev.key}>{ev.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <ErrorBox message={error} />}
        {loading && <PanelSkeleton height="400px" />}

        {overview && (
          <>
            <div className="flex flex-col items-center mb-14">
              <RiskGauge score={overview.thermal_stress.score} category={overview.thermal_stress.category} size={260} label="/ 100" />
              <div className="mt-4">
                <RiskBadge category={overview.thermal_stress.category} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5">
                  Contribution breakdown
                </h2>
                <div className="space-y-4">
                  {Object.entries(overview.thermal_stress.contributions).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="capitalize">{k.replace(/_/g, " ").replace(" contribution", "")}</span>
                        <span className="font-data">+{v}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-panel-raised)" }}>
                        <div className="h-full" style={{ width: `${(v / 45) * 100}%`, background: "var(--accent)" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-6 leading-relaxed font-data">
                  {overview.thermal_stress.formula}
                </p>
              </div>

              <div>
                <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5">
                  Underlying thermal indices
                </h2>
                <div className="space-y-4">
                  <IndexRow label="Heat Index" value={`${overview.heat_index.heat_index_c.toFixed(1)}°C`} note={overview.heat_index.notes} />
                  <IndexRow label="WBGT (outdoor)" value={`${overview.wbgt.wbgt_c.toFixed(1)}°C`} />
                  <IndexRow label="UTCI" value={`${overview.utci.utci_c.toFixed(1)}°C — ${overview.utci.stress_category}`} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function IndexRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-b pb-3" style={{ borderColor: "var(--border-hairline)" }}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-data">{value}</span>
      </div>
      {note && <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{note}</p>}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="text-sm p-4 rounded-[var(--radius-sm)] border mb-6" style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}>
      {message}
    </div>
  );
}


