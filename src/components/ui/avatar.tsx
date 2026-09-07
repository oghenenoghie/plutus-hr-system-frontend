import { initials } from "@/lib/format";

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-11 w-11 text-[16px]",
};

export function Avatar({ name, size = "sm" }: { name: string; size?: keyof typeof SIZE_CLASSES }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-border bg-primary-tint font-extrabold uppercase tracking-[0.03em] text-primary-dark ${SIZE_CLASSES[size]}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
