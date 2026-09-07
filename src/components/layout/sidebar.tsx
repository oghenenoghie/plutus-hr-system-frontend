"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  BookText,
  Building2,
  Calculator,
  Clock,
  ClipboardList,
  FileWarning,
  HandCoins,
  LayoutDashboard,
  MapPin,
  Network,
  ReceiptText,
  ShieldCheck,
  UserSquare2,
  Users,
} from "lucide-react";

import { navForRole, ROLE_LABELS, type NavItem } from "@/lib/nav";
import type { Role } from "@/lib/types";

const ICONS: Record<NavItem["icon"], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  employees: Users,
  orgChart: Network,
  departments: Building2,
  branches: MapPin,
  jobGrades: BarChart3,
  policies: BookText,
  shifts: Clock,
  payroll: Banknote,
  leave: ClipboardList,
  expenses: ReceiptText,
  loans: HandCoins,
  benefits: ShieldCheck,
  contractors: UserSquare2,
  reports: FileWarning,
  settlement: FileWarning,
  simulation: Calculator,
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-primary-dark text-white">
      <div className="px-6 py-6">
        <div className="text-[15px] font-extrabold tracking-tight">Plutus</div>
        <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.03em] text-white/50">
          Ledger
        </div>
      </div>

      <div className="mx-6 mb-4 rounded-panel border border-white/10 bg-white/5 px-3 py-2">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-white/50">
          Viewing as
        </div>
        <div className="mt-0.5 text-[13px] font-bold">{ROLE_LABELS[role]}</div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-panel px-3 py-2.5 text-[13px] font-bold transition-colors ${
                active ? "bg-primary text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={2.25} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
