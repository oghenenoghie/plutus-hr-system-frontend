"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { employeesApi, payRunsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { PayFrequency } from "@/lib/types";

const PAY_FREQUENCIES: PayFrequency[] = ["monthly", "biweekly", "weekly"];

export default function NewPayRunPage() {
  const router = useRouter();
  const employees = useApiResource(() => employeesApi.list());

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [frequency, setFrequency] = useState<PayFrequency>("monthly");
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payRun = await payRunsApi.create({
        period_start: periodStart,
        period_end: periodEnd,
        frequency,
        employee_ids: scope === "selected" ? Array.from(selectedIds) : undefined,
      });
      router.push(`/payroll?created=${payRun.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not create pay run.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Pay Run" subtitle="Opens a run against every registered employee unless scoped below" />

      <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader title="Period" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="period-start">Period Start</Label>
              <Input id="period-start" type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="period-end">Period End</Label>
              <Input id="period-end" type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as PayFrequency)}>
                {PAY_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Employee Scope" />
          <div className="mb-4 flex gap-4">
            <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <input type="radio" checked={scope === "all"} onChange={() => setScope("all")} />
              All active employees
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <input type="radio" checked={scope === "selected"} onChange={() => setScope("selected")} />
              Specific employees
            </label>
          </div>

          {scope === "selected" ? (
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-panel border border-border p-2">
              {employees.loading ? <LoadingState /> : null}
              {employees.error ? <ErrorState message={employees.error} /> : null}
              {(employees.data ?? []).map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center gap-2.5 rounded-panel px-2 py-2 text-[13px] hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                  />
                  <Avatar name={employee.full_name} size="sm" />
                  <span className="font-bold">{employee.full_name}</span>
                  <span className="text-ink-soft">{employee.employee_number}</span>
                </label>
              ))}
            </div>
          ) : null}
        </Card>

        {error ? <ErrorState message={error} /> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/payroll")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || (scope === "selected" && selectedIds.size === 0)}>
            {submitting ? "Creating…" : "Create Pay Run"}
          </Button>
        </div>
      </form>
    </div>
  );
}
