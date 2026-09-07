"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthGate } from "@/lib/auth/auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate allow={["admin", "payroll_manager", "manager"]}>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
