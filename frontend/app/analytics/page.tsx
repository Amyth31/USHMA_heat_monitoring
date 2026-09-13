"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import RiskBadge from "@/components/RiskBadge";
import { api, DemoEvent } from "@/lib/api";

const CATEGORY_ORDER = ["LOW", "MODERATE", "ELEVATED", "HIGH", "SEVERE"];

export default function AnalyticsPage() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [topDistricts, setTopDistricts] = useState<
    Array<{ name: string; state: string; population_2011: number; vulnerability_score: number; vulnerability_category: string }>
  >([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [totalDistricts, setTotalDistricts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getHistoricalEvents(),
      api.getTopVulnerableDistricts(10),
      api.getVulnerabilityDistribution(),
    ])
      .then(([ev, top, dist]) => {
        setEvents(ev.events);
        setTopDistricts(top.districts);
        setDistribution(dist.distribution);
        setTotalDistricts(dist.total_districts);
      })
      .catch((e) => setError(e.message));
  }, []);

  const maxTemp = Math.max(...events.map((e) => e.temperature_c), 1);
  const maxDistCount = Math.max(...Object.values(distribution), 1);

  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-10">
          Built entirely from real, documented data — no simulated trends.
        </p>

        {error && (
          <div className="text-sm p-4 rounded-[var(--radius-sm)] border mb-6" style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}>
            {error}
          </div>
        )}

        <section className="mb-14">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5">
            Real documented extreme-heat events (peak recorded temperature)
          </h2>
          <div className="space-y-3">
            {events.map((e) => (
              <div key={e.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{e.label}</span>
                  <span className="font-data">{e.temperature_c.toFixed(1)}°C</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-panel-raised)" }}>
                  <div
                    className="h-full"
                    style={{ width: `${(e.temperature_c / maxTemp) * 100}%`, background: "var(--accent)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5">
            Most heat-vulnerable Indian districts (real Census 2011 data, {totalDistricts} districts scored)
          </h2>
          <div className="rounded-[var(--radius-md)] border overflow-hidden" style={{ borderColor: "var(--border-hairline)" }}>
            {topDistricts.map((d, i) => (
              <div
                key={d.name + d.state}
                className="flex items-center justify-between px-5 py-3 text-sm"
                style={{
                  background: "var(--bg-panel)",
                  borderTop: i === 0 ? "none" : "1px solid var(--border-hairline)",
                }}
              >
                <div>
                  <span className="font-data text-[var(--text-tertiary)] mr-3">{i + 1}</span>
                  <span className="font-medium">{d.name}</span>
                  <span className="text-[var(--text-tertiary)] ml-2">{d.state}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {d.population_2011.toLocaleString()}
                  </span>
                  <span className="font-data">{d.vulnerability_score.toFixed(0)}</span>
                  <RiskBadge category={d.vulnerability_category} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5">
            Vulnerability distribution across all real matched districts
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="text-center">
                <div
                  className="rounded-[var(--radius-sm)] mb-2 flex items-end justify-center"
                  style={{ height: "120px", background: "var(--bg-panel)" }}
                >
                  <div
                    className="w-full rounded-[var(--radius-sm)]"
                    style={{
                      height: `${((distribution[cat] || 0) / maxDistCount) * 100}%`,
                      minHeight: distribution[cat] ? "4px" : "0px",
                      background: "var(--accent)",
                    }}
                  />
                </div>
                <div className="text-xs mb-1">
                  <RiskBadge category={cat} />
                </div>
                <div className="font-data text-sm">{distribution[cat] || 0}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
