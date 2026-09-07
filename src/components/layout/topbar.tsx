"use client";

import { LogOut } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useAuth } from "@/lib/auth/auth-context";

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <div className="flex shrink-0 items-center justify-end gap-4 border-b border-border bg-surface px-8 py-3">
      <div className="rounded-badge bg-good-tint px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.03em] text-good">
        {user?.org_name ?? "—"}
      </div>
      <div className="flex items-center gap-3.5">
        <NotificationBell />
        <Avatar name={user?.role ?? "?"} size="md" />
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          className="text-ink-soft transition-colors hover:text-bad"
        >
          <LogOut size={17} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
