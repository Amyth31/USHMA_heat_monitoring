// Small line icons for the dashboard metric strip — hand-drawn to match the
// 13px inline usage that used to pull these from lucide-react. Each accepts
// the same size/strokeWidth shape so call sites didn't need to change.

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ThermometerIcon({ size = 16, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={strokeWidth} className={className} {...base}>
      <path d="M11 4a1.5 1.5 0 0 1 3 0v9.6a4 4 0 1 1-3 0Z" />
      <path d="M12.5 15v-6" />
    </svg>
  );
}

export function DropletIcon({ size = 16, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={strokeWidth} className={className} {...base}>
      <path d="M12 3c3 3.8 6 7.4 6 10.5a6 6 0 1 1-12 0C6 10.4 9 6.8 12 3Z" />
    </svg>
  );
}

export function WindIcon({ size = 16, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={strokeWidth} className={className} {...base}>
      <path d="M3 8h11.5a2.25 2.25 0 1 0-2.1-3" />
      <path d="M3 13h15a2.25 2.25 0 1 1-2.1 3" />
      <path d="M3 18h8" />
    </svg>
  );
}

export function FlameIcon({ size = 16, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={strokeWidth} className={className} {...base}>
      <path d="M12 3c1 2.5-.5 3.8-1.8 5.2C8.9 9.7 8 11.2 8 13a4 4 0 0 0 8 0c0-1.6-.7-2.6-1.5-3.6.4 1.6-.2 2.6-1 2.6-1 0-1.2-1-.8-2 .6-1.6-.2-4.4-.7-7Z" />
    </svg>
  );
}

export function GaugeIcon({ size = 16, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={strokeWidth} className={className} {...base}>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="M12 16 15.5 10" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function SunIcon({ size = 16, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={strokeWidth} className={className} {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}