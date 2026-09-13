"use client";

import { useMemo, useState } from "react";
import { heatIndexC, wbgtC, thermalStressScore } from "@/lib/thermal-client";

const RISK_COLOR: Record<string, string> = {
  SAFE: "var(--risk-safe)",
  CAUTION: "var(--risk-caution)",
  MODERATE: "var(--risk-moderate)",
  HIGH: "var(--risk-high)",
  EXTREME: "var(--risk-extreme)",
};

export default function HumidityDemo() {
  const [temp, setTemp] = useState(40);
  const [humidity, setHumidity] = useState(45);

  const result = useMemo(() => {
    const wind = 2.0;
    const solar = 750;
    const hi = heatIndexC(temp, humidity);
    const wbgt = wbgtC(temp, humidity, solar, wind);
    const stress = thermalStressScore(temp, humidity, wind, solar, hi.value, wbgt);
    return { hi, wbgt, stress };
  }, [temp, humidity]);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-md">
          Move the sliders. The air temperature is fixed — only humidity
          changes. Watch what happens to the numbers a warning system
          actually needs.
        </p>

        <div className="space-y-8">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="temp-slider" className="text-sm text-[var(--text-secondary)]">
                Air temperature
              </label>
              <span className="font-data text-2xl">{temp.toFixed(1)}°C</span>
            </div>
            <input
              id="temp-slider"
              type="range"
              min={30}
              max={50}
              step={0.5}
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="rh-slider" className="text-sm text-[var(--text-secondary)]">
                Relative humidity
              </label>
              <span className="font-data text-2xl">{humidity.toFixed(0)}%</span>
            </div>
            <input
              id="rh-slider"
              type="range"
              min={10}
              max={90}
              step={1}
              value={humidity}
              onChange={(e) => setHumidity(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-[var(--radius-md)] border p-8 transition-colors duration-300"
        style={{
          borderColor: "var(--border-hairline)",
          background: "var(--bg-panel)",
        }}
      >
        <div className="grid grid-cols-2 gap-6 mb-8">
          <Metric label="Heat Index" value={`${result.hi.value.toFixed(1)}°C`} />
          <Metric label="WBGT (outdoor)" value={`${result.wbgt.toFixed(1)}°C`} />
        </div>

        <div className="border-t pt-6" style={{ borderColor: "var(--border-hairline)" }}>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm text-[var(--text-secondary)]">Human Thermal Stress</span>
            <span
              className="text-sm font-medium px-2.5 py-1 rounded-[var(--radius-sm)]"
              style={{
                color: RISK_COLOR[result.stress.category],
                background: `color-mix(in srgb, ${RISK_COLOR[result.stress.category]} 15%, transparent)`,
              }}
            >
              {result.stress.category}
            </span>
          </div>
          <div className="font-data text-6xl mb-3 transition-colors duration-300" style={{ color: RISK_COLOR[result.stress.category] }}>
            {result.stress.score.toFixed(0)}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-panel-raised)" }}>
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${result.stress.score}%`, background: RISK_COLOR[result.stress.category] }}
            />
          </div>
        </div>

        {result.hi.extrapolated && (
          <p className="text-xs text-[var(--text-tertiary)] mt-4 leading-relaxed">
            This temperature and humidity combination is at the extreme edge of what
            physically occurs — flagged, not hidden, as our methodology page explains.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--text-tertiary)] mb-1">{label}</div>
      <div className="font-data text-3xl">{value}</div>
    </div>
  );
}
