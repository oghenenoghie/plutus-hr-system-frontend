import { forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={`w-full rounded-panel border border-border bg-surface px-[13px] py-[11px] text-[13px] text-ink outline-none focus:border-primary ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  },
);
