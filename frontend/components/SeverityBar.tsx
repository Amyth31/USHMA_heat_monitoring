"use client";

interface SeverityBarProps {
  label: string;
  value: number;
  contribution?: number;
  unit?: string;
}

function getRiskLevel(value: number) {
  if (value <= 20) {
    return {
      label: "SAFE",
      color: "var(--risk-safe)",
    };
  }

  if (value <= 40) {
    return {
      label: "CAUTION",
      color: "var(--risk-caution)",
    };
  }

  if (value <= 60) {
    return {
      label: "MODERATE",
      color: "var(--risk-moderate)",
    };
  }

  if (value <= 80) {
    return {
      label: "HIGH",
      color: "var(--risk-high)",
    };
  }

  return {
    label: "EXTREME",
    color: "var(--risk-extreme)",
  };
}

export default function SeverityBar({
  label,
  value,
  contribution,
  unit,
}: SeverityBarProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const risk = getRiskLevel(normalizedValue);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          {label}
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: risk.color }}
          >
            {Math.round(normalizedValue)}
            {unit ? ` ${unit}` : ""}
          </span>

          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            / 100
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-2 w-full overflow-hidden bg-[var(--bg-panel-raised)]">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${normalizedValue}%`,
            backgroundColor: risk.color,
          }}
        />
      </div>

      {/* Footer */}
      <div className="mt-2">
        <span
            className="font-mono text-[10px] uppercase tracking-[0.08em]"
            style={{ color: risk.color }}
        >
            {risk.label}
        </span>
        </div>
    </div>
  );
}