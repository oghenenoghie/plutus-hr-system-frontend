export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[22px] font-extrabold text-ink">{title}</h1>
        <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
