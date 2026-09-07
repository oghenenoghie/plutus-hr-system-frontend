export function Card({
  children,
  className = "",
  padding = "standard",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "standard" | "compact";
}) {
  return (
    <div
      className={`rounded-card border border-border bg-surface ${padding === "compact" ? "p-5" : "p-6"} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-extrabold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-ink-soft">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
