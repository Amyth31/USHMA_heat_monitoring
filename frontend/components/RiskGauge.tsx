"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { RISK_COLORS } from "@/lib/api";

export default function RiskGauge({
  score,
  category,
  size = 220,
  label,
}: {
  score: number;
  category: string;
  size?: number;
  label?: string;
}) {
  const color = RISK_COLORS[category] || "var(--accent)";
  const data = [{ value: score, fill: color }];

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <RadialBarChart
        width={size}
        height={size}
        cx="50%"
        cy="50%"
        innerRadius="72%"
        outerRadius="100%"
        barSize={size * 0.09}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar dataKey="value" cornerRadius={size} background={{ fill: "var(--bg-panel-raised)" }} angleAxisId={0} />
      </RadialBarChart>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ top: 0, left: 0 }}
      >
        <span className="font-data leading-none" style={{ fontSize: size * 0.22, color }}>
          {score.toFixed(0)}
        </span>
        {label && <span className="text-xs text-[var(--text-tertiary)] mt-1">{label}</span>}
      </div>
    </div>
  );
}
