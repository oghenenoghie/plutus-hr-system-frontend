"use client";

import { TopBar } from "@/components/layout/topbar";
import { AuthGate } from "@/lib/auth/auth-gate";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </AuthGate>
  );
}
