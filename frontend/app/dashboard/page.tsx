"use client";

import DemoScenarioSelect from "@/components/DemoScenarioSelect";
import { useEffect, useState } from "react";
import { api, Location, RiskOverview, Recommendation, DemoEvent } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import LocationSearch from "@/components/LocationSearch";
import TopNav from "@/components/TopNav";
import RiskGauge from "@/components/RiskGauge";
import { MetricStripSkeleton, PanelSkeleton } from "@/components/Skeleton";
import { Thermometer, Droplets, Wind, Flame, Gauge, Sun } from "lucide-react";

export default function DashboardPage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [demoEvents, setDemoEvents] = useState<DemoEvent[]>([]);
  const [demoKey, setDemoKey] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDemoEvents().then((r) => setDemoEvents(r.events)).catch(() => {});
    // Default to a real North West Delhi location on first load
    api
      .searchLocations("North West Delhi")
      .then((r) => {
        if (r.results[0]) setLocation(r.results[0]);
      })
      .catch(() => setError("Cannot reach USHMA backend at localhost:5000. Run `python backend/app.py`."));
  }, []);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getRiskOverview(location.location_id, demoKey),
      api.getRecommendations(location.location_id, demoKey),
    ])
      .then(([ov, rc]) => {
        setOverview(ov);
        setRecs(rc.recommendations);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location, demoKey]);

  return (
    <main className="min-h-screen">
      <TopNav />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Heat Risk Command Centre</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {location ? `${location.name}, ${location.state}` : "Select a location"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LocationSearch onSelect={setLocation} />
            <DemoScenarioSelect value={demoKey} onChange={setDemoKey} events={demoEvents} />
          </div>
        </div>

        {error && (
          <div
            className="rounded-[var(--radius-sm)] border p-4 text-sm mb-6"
            style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}
          >
            {error}
          </div>
        )}

        {loading && (
          <>
            <MetricStripSkeleton />
            <div className="grid lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2 space-y-6">
                <PanelSkeleton height="280px" />
                <PanelSkeleton height="140px" />
              </div>
              <div className="space-y-6">
                <PanelSkeleton />
                <PanelSkeleton />
              </div>
            </div>
          </>
        )}

        {overview && (
          <>
            <div
              className="text-xs mb-6 px-3 py-2 rounded-[var(--radius-sm)] inline-block"
              style={{ background: "var(--bg-panel)", color: "var(--text-tertiary)" }}
            >
              Data source: {overview.weather.source}
            </div>

            <MetricStrip overview={overview} />

            <div className="grid lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2 space-y-6">
                <ThermalStressPanel overview={overview} />
                <HeatwavePanel overview={overview} />
              </div>
              <div className="space-y-6">
                <VulnerabilityPanel overview={overview} />
                <RecommendationsPanel recs={recs} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function MetricStrip({ overview }: { overview: RiskOverview }) {
  const items = [
    { label: "Temperature", value: `${overview.weather.temperature_c.toFixed(1)}°C`, Icon: Thermometer },
    { label: "Humidity", value: `${overview.weather.relative_humidity_pct.toFixed(0)}%`, Icon: Droplets },
    { label: "Wind", value: `${overview.weather.wind_speed_ms.toFixed(1)} m/s`, Icon: Wind },
    { label: "Heat Index", value: `${overview.heat_index.heat_index_c.toFixed(1)}°C`, Icon: Flame },
    { label: "WBGT", value: `${overview.wbgt.wbgt_c.toFixed(1)}°C`, Icon: Gauge },
    { label: "UTCI", value: `${overview.utci.utci_c.toFixed(1)}°C`, Icon: Sun },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-px" style={{ background: "var(--border-hairline)" }}>
      {items.map(({ label, value, Icon }) => (
        <div key={label} className="p-4" style={{ background: "var(--bg-panel)" }}>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-1.5">
            <Icon size={13} strokeWidth={1.75} />
            <span>{label}</span>
          </div>
          <div className="font-data text-xl">{value}</div>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border p-6" style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)" }}>
      <h3 className="text-sm font-medium mb-4 text-[var(--text-secondary)]">{title}</h3>
      {children}
    </div>
  );
}

function ThermalStressPanel({ overview }: { overview: RiskOverview }) {
  const s = overview.thermal_stress;
  return (
    <Panel title="Human Thermal Stress — why is this location at risk?">
      <div className="flex items-center gap-6 mb-6">
        <RiskGauge score={s.score} category={s.category} size={140} />
        <div>
          <RiskBadge category={s.category} />
          <p className="text-xs text-[var(--text-tertiary)] mt-3 max-w-[200px] leading-relaxed">
            Composite score from real WBGT, Heat Index, wind, solar radiation,
            exposure and vulnerability.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(s.contributions).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-secondary)] w-52 shrink-0">
              {k.replace(/_/g, " ").replace(" contribution", "")}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-panel-raised)" }}>
              <div className="h-full" style={{ width: `${(v / 45) * 100}%`, background: "var(--accent)" }} />
            </div>
            <span className="font-data text-xs w-10 text-right">+{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4" style={{ borderColor: "var(--border-hairline)" }}>
        <div>
          <div className="text-xs text-[var(--text-tertiary)] mb-1">Mortality relative risk</div>
          <div className="font-data text-lg">{overview.health_risk.mortality_relative_risk}×</div>
          <RiskBadge category={overview.health_risk.mortality_risk_category} />
        </div>
        <div>
          <div className="text-xs text-[var(--text-tertiary)] mb-1">Hospitalization relative risk</div>
          <div className="font-data text-lg">{overview.health_risk.hospitalization_relative_risk}×</div>
          <RiskBadge category={overview.health_risk.hospitalization_risk_category} />
        </div>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mt-4 leading-relaxed">{overview.health_risk.methodology_note}</p>
    </Panel>
  );
}

function HeatwavePanel({ overview }: { overview: RiskOverview }) {
  const hw = overview.heatwave;
  return (
    <Panel title="Heatwave status (IMD criteria)">
      <div className="flex items-center gap-3 mb-4">
        <RiskBadge category={hw.overall_status} />
        {hw.confirmed_multiday_heatwave && (
          <span className="text-xs text-[var(--text-secondary)]">
            Confirmed — {hw.consecutive_severe_days} consecutive severe days
          </span>
        )}
      </div>
      <div className="flex gap-1">
        {hw.daily_breakdown.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-xs text-[var(--text-tertiary)] mb-1">D{i + 1}</div>
            <div
              className="h-16 rounded-[var(--radius-sm)] flex items-end justify-center pb-1 text-xs font-data"
              style={{ background: "var(--bg-panel-raised)" }}
            >
              +{d.departure_from_normal_c}°
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function VulnerabilityPanel({ overview }: { overview: RiskOverview }) {
  const v = overview.vulnerability;
  if (!v) return null;
  return (
    <Panel title="Population vulnerability (Census 2011)">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-data text-4xl">{v.score.toFixed(0)}</span>
        <span className="text-[var(--text-tertiary)]">/ 100</span>
        <RiskBadge category={v.category} />
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Population" value={v.inputs.population_2011.toLocaleString()} />
        <Row label="Density" value={`${v.inputs.population_density_km2.toFixed(0)}/km²`} />
        <Row label="Elderly (50+)" value={`${v.inputs.elderly_pct_50plus.toFixed(1)}%`} />
        <Row label="Outdoor workers" value={`${v.inputs.outdoor_worker_pct.toFixed(1)}%`} />
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mt-4">{v.data_source}</p>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-data">{value}</span>
    </div>
  );
}

function RecommendationsPanel({ recs }: { recs: Recommendation[] }) {
  return (
    <Panel title="Recommended actions">
      <div className="space-y-4">
        {recs.map((r, i) => (
          <div key={i} className="pb-4 border-b last:border-0 last:pb-0" style={{ borderColor: "var(--border-hairline)" }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-sm font-medium">{r.action}</span>
              <RiskBadge category={r.risk_level} />
            </div>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{r.reason}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
