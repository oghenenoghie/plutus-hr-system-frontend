"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookText,
  Boxes,
  Building2,
  Calculator,
  Clock,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileWarning,
  Gavel,
  GraduationCap,
  HandCoins,
  Landmark,
  Laptop,
  LayoutDashboard,
  Link2,
  MapPin,
  Network,
  PiggyBank,
  Receipt,
  ReceiptText,
  ShieldCheck,
  Star,
  UserPlus,
  UserSquare2,
  Users,
  Users2,
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
  recruitment: UserPlus,
  performance: Star,
  learning: GraduationCap,
  employeeRelations: Gavel,
  unionDues: Users2,
  assets: Laptop,
  integrations: Link2,
  generalLedger: Landmark,
  bills: CreditCard,
  invoices: Receipt,
  financialStatements: FileBarChart,
  fixedAssets: Boxes,
  budgets: PiggyBank,
  bankReconciliation: ArrowLeftRight,
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

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col overflow-y-auto bg-primary-dark text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">Plutus</div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.03em] text-white/50">
              Ledger
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-panel border border-white/10 px-2.5 py-1 text-[13px] font-bold text-white/70 lg:hidden"
          >
            ✕
          </button>
        </div>

        <div className="mx-6 mb-4 rounded-panel border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-white/50">
            Viewing as
          </div>
          <div className="mt-0.5 text-[13px] font-bold">{ROLE_LABELS[role]}</div>
        </div>

        <nav className="flex-1 space-y-1 px-4 pb-6">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-panel px-3 py-2.5 text-[13px] font-bold transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} strokeWidth={2.25} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
