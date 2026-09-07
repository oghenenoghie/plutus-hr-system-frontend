"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Wraps an approve/reject/remit-style API call with a confirm-first click,
// then runs it with a pending state so a slow request can't look like the
// click did nothing.
export function ConfirmActionButton({
  action,
  label,
  pendingLabel = "Working…",
  confirmTitle,
  confirmMessage,
  confirmLabel = "Confirm",
  tone = "danger",
  className,
  disabled,
}: {
  action: () => Promise<unknown> | unknown;
  label: string;
  pendingLabel?: string;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setOpen(false);
    startTransition(async () => {
      await action();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || isPending}
        className={
          className ??
          `rounded-btn border border-border px-[14px] py-[7px] text-[12px] font-bold disabled:opacity-50 ${tone === "danger" ? "text-bad" : "text-primary"}`
        }
      >
        {isPending ? pendingLabel : label}
      </button>
      {open && (
        <ConfirmDialog
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={confirmLabel}
          tone={tone}
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
