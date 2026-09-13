"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";

interface ForecastPoint {
  day: string;
  temperature: number;
  stress: number;
  wbgt: number;
}

export default function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="stressFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--risk-high)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--risk-high)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" vertical={false} />
        <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={32} />
        <YAxis yAxisId="right" orientation="right" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--border-hairline-strong)",
            borderRadius: 5,
            fontSize: 13,
          }}
          labelStyle={{ color: "var(--text-primary)" }}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="stress"
          stroke="var(--risk-high)"
          fill="url(#stressFill)"
          strokeWidth={2}
          name="Thermal Stress"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="temperature"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--accent)" }}
          name="Temperature °C"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="wbgt"
          stroke="var(--risk-caution)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          name="WBGT °C"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
