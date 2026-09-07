import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "employees"
    | "departments"
    | "payroll"
    | "leave"
    | "expenses"
    | "loans"
    | "benefits"
    | "contractors"
    | "reports"
    | "settlement"
    | "simulation";
  roles: Role[];
}

// Roles allowed to view each section — mirrors the backend's require_roles()
// gates where they exist (dashboard is admin/payroll_manager only server-side),
// otherwise a sensible admin/payroll_manager/manager split for HR-facing screens.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "dashboard", roles: ["admin", "payroll_manager"] },
  { href: "/employees", label: "Employees", icon: "employees", roles: ["admin", "payroll_manager", "manager"] },
  { href: "/departments", label: "Departments", icon: "departments", roles: ["admin", "payroll_manager", "manager"] },
  { href: "/payroll", label: "Payroll Runs", icon: "payroll", roles: ["admin", "payroll_manager"] },
  { href: "/leave", label: "Leave", icon: "leave", roles: ["admin", "payroll_manager", "manager"] },
  { href: "/expenses", label: "Expenses", icon: "expenses", roles: ["admin", "payroll_manager", "manager"] },
  { href: "/loans", label: "Loans & Advances", icon: "loans", roles: ["admin", "payroll_manager", "manager"] },
  { href: "/benefits", label: "Benefits", icon: "benefits", roles: ["admin", "payroll_manager", "manager"] },
  { href: "/contractors", label: "Contractors", icon: "contractors", roles: ["admin", "payroll_manager"] },
  { href: "/reports", label: "Statutory Reports", icon: "reports", roles: ["admin", "payroll_manager"] },
  { href: "/settlement", label: "Final Settlement", icon: "settlement", roles: ["admin", "payroll_manager"] },
  { href: "/simulation", label: "Simulation", icon: "simulation", roles: ["admin", "payroll_manager"] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  payroll_manager: "Payroll Manager",
  manager: "Manager",
  employee: "Employee",
};
