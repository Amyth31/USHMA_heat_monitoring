import { useId } from "react";
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
  const clipId = useId();
  const color = RISK_COLORS[category] || "var(--accent)";
  const clamped = Math.max(0, Math.min(100, score));
  const strokeColor = "var(--text-secondary)";

  const viewW = 90;
  const tubeWidth = 20;
  const strokeW = 3;
  const cornerR = tubeWidth / 2;
  const tubeTop = 12;
  const bulbRadius = 30;
  const bulbCenterY = 170;
  const bulbTopY = bulbCenterY - bulbRadius;
  const stubDepth = 16;
  const viewH = bulbCenterY + bulbRadius + 14;
  const cx = viewW / 2;
  const tubeX = cx - tubeWidth / 2;

  const tickY = (t: number) => bulbTopY - ((bulbTopY - tubeTop) * t) / 100;
  const fillTop = tickY(clamped);
  const ticks = [0, 20, 40, 60, 80, 100];

  // Closed capsule (rounded top, flat bottom at the bulb line) — clips the
  // mercury rect so it respects the rounded cap when the score is near 100.
  const tubeShape = `
    M ${tubeX} ${tubeTop + cornerR}
    A ${cornerR} ${cornerR} 0 0 1 ${tubeX + tubeWidth} ${tubeTop + cornerR}
    L ${tubeX + tubeWidth} ${bulbTopY}
    L ${tubeX} ${bulbTopY}
    Z
  `;

  // Same shape, open — this is the visible outline stroke.
  const tubeOutline = `
    M ${tubeX} ${bulbTopY}
    L ${tubeX} ${tubeTop + cornerR}
    A ${cornerR} ${cornerR} 0 0 1 ${tubeX + tubeWidth} ${tubeTop + cornerR}
    L ${tubeX + tubeWidth} ${bulbTopY}
  `;

  const svgHeight = size;
  const svgWidth = (size * viewW) / viewH;

  return (
    <div className="flex items-center gap-6">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${viewW} ${viewH}`}>
        <defs>
          <clipPath id={`tube-${clipId}`}>
            <path d={tubeShape} />
          </clipPath>
        </defs>

        {/* bulb — always solid, never "empty" */}
        <circle cx={cx} cy={bulbCenterY} r={bulbRadius} fill={color} stroke={strokeColor} strokeWidth={strokeW} />

        {/* mercury column, clipped to the tube's rounded cap */}
        <rect x={tubeX} y={fillTop} width={tubeWidth} height={bulbTopY - fillTop} fill={color} clipPath={`url(#tube-${clipId})`} />

        {/* tick marks, full height of the tube */}
        {ticks.map((t) => (
          <line key={t} x1={tubeX - 8} y1={tickY(t)} x2={tubeX - 2} y2={tickY(t)} stroke={strokeColor} strokeWidth={2} strokeLinecap="round" />
        ))}

        {/* tube outline */}
        <path d={tubeOutline} fill="none" stroke={strokeColor} strokeWidth={strokeW} strokeLinecap="round" />

        {/* the detail that sells it: tube walls dipping into the bulb */}
        <line x1={tubeX} y1={bulbTopY} x2={tubeX} y2={bulbTopY + stubDepth} stroke={strokeColor} strokeWidth={strokeW} strokeLinecap="round" />
        <line x1={tubeX + tubeWidth} y1={bulbTopY} x2={tubeX + tubeWidth} y2={bulbTopY + stubDepth} stroke={strokeColor} strokeWidth={strokeW} strokeLinecap="round" />
      </svg>

      <div>
        <div className="text-4xl font-semibold leading-none font-mono" style={{ color }}>
          {Math.round(clamped)}
        </div>
        <div className="text-sm font-medium mt-2" style={{ color }}>
          {category}
        </div>
        {label && (
          <div className="text-xs text-[var(--text-tertiary)] mt-1 uppercase tracking-[0.08em]">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}