"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { benefitsApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function BenefitsPage() {
  const [employeeId, setEmployeeId] = useState("");
  const benefits = useApiResource(
    () => (employeeId ? benefitsApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );

  return (
    <div>
      <PageHeader title="Benefits Administration" subtitle="Plan enrollment and employer cost per employee" />

      <Card className="mb-6">
        <Label htmlFor="employee">Employee</Label>
        <div className="max-w-sm">
          <EmployeePicker value={employeeId} onChange={setEmployeeId} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Enrolled Benefits" />
        {!employeeId ? <EmptyState label="Select an employee to view their benefits." /> : null}
        {employeeId && benefits.loading ? <LoadingState /> : null}
        {benefits.error ? <ErrorState message={benefits.error} /> : null}
        {employeeId && benefits.data && benefits.data.length === 0 ? (
          <EmptyState label="No benefits enrolled for this employee." />
        ) : null}
        {benefits.data && benefits.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Plan</Th>
                <Th>Frequency</Th>
                <Th align="right">Value</Th>
                <Th>Effective</Th>
                <Th>Ends</Th>
              </tr>
            </Thead>
            <tbody>
              {benefits.data.map((benefit) => (
                <tr key={benefit.id}>
                  <Td>
                    <div className="font-bold">{benefit.name}</div>
                    {benefit.description ? (
                      <div className="text-[11px] text-ink-soft">{benefit.description}</div>
                    ) : null}
                  </Td>
                  <Td>{titleCase(benefit.frequency)}</Td>
                  <Td align="right">{benefit.value_minor != null ? formatNaira(benefit.value_minor) : "—"}</Td>
                  <Td>{formatDate(benefit.effective_date)}</Td>
                  <Td>{formatDate(benefit.end_date)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
