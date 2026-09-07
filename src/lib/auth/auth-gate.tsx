"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import type { Role } from "@/lib/types";

// Redirects unauthenticated visitors to /login, and — when `allow` is given —
// bumps a signed-in user with the wrong role to their home surface instead of
// rendering a shell they have no nav access to.
export function AuthGate({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: Role[];
}) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && user && allow && !allow.includes(user.role)) {
      router.replace(homeForRole(user.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

  if (status !== "authenticated" || (allow && user && !allow.includes(user.role))) {
    return <div className="flex h-screen items-center justify-center bg-bg text-[13px] text-ink-soft">Loading…</div>;
  }

  return <>{children}</>;
}

export function homeForRole(role: Role): string {
  return role === "employee" ? "/me" : "/dashboard";
}
