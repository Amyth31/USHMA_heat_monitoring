"use client";

import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";

interface ForecastPoint {
  day: string;
  temperature: number;
  stress: number;
  wbgt: number;
}

const SERIES = [
  { key: "temperature", label: "Temperature °C", color: "var(--accent)" },
  { key: "wbgt", label: "WBGT °C", color: "var(--risk-caution)" },
  { key: "stress", label: "Thermal Stress", color: "var(--risk-high)" },
];

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-[var(--radius-sm)] border px-3 py-2 text-xs"
      style={{ background: "var(--bg-panel-raised)", borderColor: "var(--border-hairline-strong)" }}
    >
      <div className="mb-1.5" style={{ color: "var(--text-primary)" }}>{label}</div>
      <div className="space-y-1 font-mono">
        {payload.map((p) => {
          const series = SERIES.find((s) => s.key === p.dataKey);
          return (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{series?.label ?? p.dataKey}</span>
              <span style={{ color: "var(--text-primary)" }}>{p.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <div>
      <Legend />
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-hairline)" vertical={false} />
          <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={32} />
          <YAxis yAxisId="right" orientation="right" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ outline: "none" }} cursor={{ stroke: "var(--border-hairline-strong)" }} />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="stress"
            stroke="var(--risk-high)"
            fill="var(--risk-high)"
            fillOpacity={0.12}
            strokeWidth={1.5}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="wbgt"
            stroke="var(--risk-caution)"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}