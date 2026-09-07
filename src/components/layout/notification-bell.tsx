"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { notificationsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unread = useApiResource(() => notificationsApi.unreadCount());
  const notifications = useApiResource(() => (open ? notificationsApi.mine() : Promise.resolve([])), [
    open,
  ]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      notifications.reload();
      unread.reload();
    } catch {
      // best-effort — the bell shouldn't surface a toast for this
    }
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      notifications.reload();
      unread.reload();
    } catch {
      // best-effort
    }
  }

  const unreadCount = unread.data?.unread_count ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative text-ink-soft transition-colors hover:text-ink"
      >
        <Bell size={17} strokeWidth={2.25} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-card border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-[12px] font-extrabold text-ink">Notifications</span>
            {unreadCount > 0 ? (
              <Button size="md" variant="secondary" onClick={markAllRead}>
                Mark all read
              </Button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.loading ? <LoadingState /> : null}
            {notifications.error ? <ErrorState message={notifications.error} /> : null}
            {notifications.data && notifications.data.length === 0 ? (
              <EmptyState label="No notifications yet." />
            ) : null}
            {notifications.data?.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => markRead(notification.id)}
                className={`block w-full rounded-panel px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-bg ${
                  notification.read_at ? "text-ink-soft" : "text-ink"
                }`}
              >
                <div className="flex items-center gap-2">
                  {!notification.read_at ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  ) : null}
                  <span className="font-bold">{notification.title}</span>
                </div>
                {notification.body ? (
                  <p className="mt-1 line-clamp-2 text-ink-soft">{notification.body}</p>
                ) : null}
                <span className="mt-1 block text-[10.5px] text-ink-soft">
                  {formatDate(notification.created_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
