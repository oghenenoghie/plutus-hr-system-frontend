import { Card } from "@/components/ui/card";

export function KpiTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card padding="compact">
      <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{label}</div>
      <div className="mt-2 text-[24px] font-extrabold text-ink">{value}</div>
      {caption ? <div className="mt-1 text-[11px] text-ink-soft">{caption}</div> : null}
    </Card>
  );
}
