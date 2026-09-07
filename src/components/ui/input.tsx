import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-panel border border-border bg-surface px-[13px] py-[11px] text-[13px] text-ink outline-none placeholder:text-ink-soft focus:border-primary ${className}`}
        {...props}
      />
    );
  },
);

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft"
    >
      {children}
    </label>
  );
}
