"use client";

import TopNav from "@/components/TopNav";
import RiskBadge from "@/components/RiskBadge";
import LocationSearch from "@/components/LocationSearch";
import DemoScenarioSelect from "@/components/DemoScenarioSelect";
import { PanelSkeleton } from "@/components/Skeleton";
import { RISK_COLORS } from "@/lib/api";
import { useRiskOverview } from "@/hooks/useRiskOverview";

export default function HealthRiskPage() {
  const { location, setLocation, overview, demoEvents, demoKey, setDemoKey, loading, error } =
    useRiskOverview();

  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Health Risk</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {location ? `${location.name}, ${location.state}` : "Select a location"}
            </p>
          </div>
          <div className="flex gap-3">
            <LocationSearch onSelect={setLocation} />
            <DemoScenarioSelect value={demoKey} onChange={setDemoKey} events={demoEvents} />
          </div>
        </div>

        <div
          className="text-xs p-3 rounded-[var(--radius-sm)] mb-8"
          style={{ background: "var(--bg-panel)", color: "var(--text-tertiary)" }}
        >
          Predictions shown for demonstration and decision-support prototyping. They are
          not clinical diagnoses or validated mortality estimates.
        </div>

        {error && (
          <div className="text-sm p-4 rounded-[var(--radius-sm)] border mb-6" style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}>
            {error}
          </div>
        )}
        {loading && (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <PanelSkeleton height="160px" />
            <PanelSkeleton height="160px" />
          </div>
        )}

        {overview && (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <RiskCard
              title="Mortality relative risk"
              value={`${overview.health_risk.mortality_relative_risk}×`}
              rawValue={overview.health_risk.mortality_relative_risk}
              category={overview.health_risk.mortality_risk_category}
              note="vs. baseline risk below the documented 40°C threshold"
            />
            <RiskCard
              title="Hospitalization relative risk"
              value={`${overview.health_risk.hospitalization_relative_risk}×`}
              rawValue={overview.health_risk.hospitalization_relative_risk}
              category={overview.health_risk.hospitalization_risk_category}
              note="scaled from the mortality curve per heat-illness literature"
            />
          </div>
        )}

        {overview && (
          <div className="rounded-[var(--radius-md)] border p-6" style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)" }}>
            <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
              AI Model — demonstration data, explainability
            </h2>
            <div className="space-y-3 text-sm mb-6">
              <ExplainRow label="Base temperature relative risk" value={overview.health_risk.explanation?.base_temperature_relative_risk ?? "—"} />
              <ExplainRow label="Heatwave duration multiplier" value={overview.health_risk.explanation?.heatwave_duration_multiplier ?? "—"} />
              <ExplainRow label="Vulnerability multiplier" value={overview.health_risk.explanation?.vulnerability_multiplier ?? "—"} />
              <ExplainRow label="Heat Action Plan assumed active" value={String(overview.health_risk.explanation?.heat_action_plan_assumed_active ?? "—")} />
            </div>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              {overview.health_risk.methodology_note}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

const RELATIVE_RISK_SCALE_MAX = 5;

function RiskCard({ title, value, rawValue, category, note }: { title: string; value: string; rawValue: number; category: string; note: string }) {
  const color = RISK_COLORS[category] || "var(--text-secondary)";
  const pct = Math.min(100, (rawValue / RELATIVE_RISK_SCALE_MAX) * 100);
  return (
    <div className="rounded-[var(--radius-md)] border p-6" style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)" }}>
      <div className="text-sm text-[var(--text-secondary)] mb-2">{title}</div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-data text-4xl">{value}</span>
        <RiskBadge category={category} />
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--bg-panel-raised)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs text-[var(--text-tertiary)]">{note}</p>
    </div>
  );
}

function ExplainRow({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-data">{String(value)}</span>
    </div>
  );
}