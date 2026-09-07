"use client";

import { employeesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";

export function EmployeePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (employeeId: string) => void;
}) {
  const employees = useApiResource(() => employeesApi.list());

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-panel border border-border bg-surface px-[13px] py-[11px] text-[13px] text-ink outline-none focus:border-primary"
    >
      <option value="">
        {employees.loading ? "Loading employees…" : "Select an employee"}
      </option>
      {(employees.data ?? []).map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.full_name} · {employee.employee_number}
        </option>
      ))}
    </select>
  );
}
