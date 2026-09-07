"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { simulationApi } from "@/lib/api/endpoints";
import { formatNaira } from "@/lib/format";
import type { SimulationOut } from "@/lib/types";

const TODAY = new Date().toISOString().slice(0, 10);

export default function SimulationPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [periodEnd, setPeriodEnd] = useState(TODAY);
  const [basic, setBasic] = useState("");
  const [housing, setHousing] = useState("");
  const [transport, setTransport] = useState("");
  const [result, setResult] = useState<SimulationOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const out = await simulationApi.payslip(employeeId, {
        period_end: periodEnd,
        basic_minor: basic ? Math.round(Number(basic) * 100) : undefined,
        housing_minor: housing ? Math.round(Number(housing) * 100) : undefined,
        transport_minor: transport ? Math.round(Number(transport) * 100) : undefined,
      });
      setResult(out);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Simulation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Payroll Simulation" subtitle="Every figure derived step by step, the way the engine computes it" />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader title="Inputs" subtitle="Leave pay components blank to use the employee's current record" />
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="employee">Employee</Label>
              <EmployeePicker value={employeeId} onChange={setEmployeeId} />
            </div>
            <div>
              <Label htmlFor="period">Period End</Label>
              <Input id="period" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="basic">Annual Basic (₦, override)</Label>
              <Input id="basic" inputMode="decimal" value={basic} onChange={(e) => setBasic(e.target.value)} placeholder="e.g. 3600000" />
            </div>
            <div>
              <Label htmlFor="housing">Annual Housing (₦, override)</Label>
              <Input id="housing" inputMode="decimal" value={housing} onChange={(e) => setHousing(e.target.value)} placeholder="e.g. 2160000" />
            </div>
            <div>
              <Label htmlFor="transport">Annual Transport (₦, override)</Label>
              <Input id="transport" inputMode="decimal" value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="e.g. 1440000" />
            </div>
            <Button type="submit" className="w-full" disabled={!employeeId || submitting}>
              {submitting ? "Simulating…" : "Run Simulation"}
            </Button>
            {error ? <ErrorState message={error} /> : null}
          </form>
        </Card>

        <Card>
          <CardHeader title="Derivation" subtitle="Gross → statutory deductions → chargeable income → PAYE → net" />
          {!result ? (
            <p className="py-8 text-center text-[13px] text-ink-soft">
              Run a simulation to see the payslip breakdown.
            </p>
          ) : (
            <div className="space-y-3">
              <DerivationRow label="Gross Pay" value={result.gross_minor} />
              <DerivationRow label="Pensionable Pay" value={result.pensionable_pay_minor} />
              <DerivationRow label="Pension (Employee, 8%)" value={result.pension_employee_minor} subtract />
              <DerivationRow label="Pension (Employer, 10%)" value={result.pension_employer_minor} muted />
              <DerivationRow label="NHF (2.5%)" value={result.nhf_minor} subtract />
              <DerivationRow label="Cumulative Rent Relief" value={result.cumulative_rent_relief_minor} muted />
              <DerivationRow label="Cumulative Chargeable Income" value={result.cumulative_chargeable_income_minor} />
              <DerivationRow label="PAYE" value={result.paye_minor} subtract />
              {result.loan_deduction_minor > 0 ? (
                <DerivationRow label="Loan Deduction" value={result.loan_deduction_minor} subtract />
              ) : null}
              <div className="!mt-6 flex items-center justify-between border-t-2 border-primary pt-4">
                <span className="text-[13px] font-extrabold text-ink">Net Pay</span>
                <span className="text-[20px] font-extrabold text-primary">{formatNaira(result.net_pay_minor)}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DerivationRow({
  label,
  value,
  subtract,
  muted,
}: {
  label: string;
  value: number;
  subtract?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <span className={`text-[13px] ${muted ? "text-ink-soft" : "font-bold text-ink"}`}>{label}</span>
      <span className={`text-[13px] font-bold ${subtract ? "text-bad" : "text-ink"}`}>
        {subtract ? "− " : ""}
        {formatNaira(value)}
      </span>
    </div>
  );
}
