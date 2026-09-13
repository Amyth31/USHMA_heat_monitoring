export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-sm)] ${className}`}
      style={{ background: "var(--bg-panel-raised)" }}
    />
  );
}

export function MetricStripSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-px" style={{ background: "var(--border-hairline)" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 space-y-2" style={{ background: "var(--bg-panel)" }}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ height = "200px" }: { height?: string }) {
  return (
    <div
      className="rounded-[var(--radius-md)] border p-6 space-y-4"
      style={{ borderColor: "var(--border-hairline)", background: "var(--bg-panel)", minHeight: height }}
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-12 w-24" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-2 w-5/6" />
      <Skeleton className="h-2 w-2/3" />
    </div>
  );
}
