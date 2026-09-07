"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { finalSettlementApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function SettlementPage() {
  const [employeeId, setEmployeeId] = useState("");
  const settlements = useApiResource(
    () => (employeeId ? finalSettlementApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );

  return (
    <div>
      <PageHeader title="Final Settlement" subtitle="Exit payroll — gratuity, leave payout and loan clearance" />

      <Card className="mb-6">
        <Label htmlFor="employee">Employee</Label>
        <div className="max-w-sm">
          <EmployeePicker value={employeeId} onChange={setEmployeeId} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Settlement Records" />
        {!employeeId ? <EmptyState label="Select an employee to view their settlement history." /> : null}
        {employeeId && settlements.loading ? <LoadingState /> : null}
        {settlements.error ? <ErrorState message={settlements.error} /> : null}
        {employeeId && settlements.data && settlements.data.length === 0 ? (
          <EmptyState label="No final settlement on record for this employee." />
        ) : null}
        {settlements.data && settlements.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Termination Date</Th>
                <Th align="right">Leave Days Paid</Th>
                <Th align="right">Leave Payout</Th>
                <Th align="right">Gratuity</Th>
                <Th align="right">Loan Recovered</Th>
                <Th align="right">Net Settlement</Th>
              </tr>
            </Thead>
            <tbody>
              {settlements.data.map((settlement) => (
                <tr key={settlement.id}>
                  <Td>{formatDate(settlement.termination_date)}</Td>
                  <Td align="right">{settlement.leave_days_paid_out}</Td>
                  <Td align="right">{formatNaira(settlement.leave_payout_minor)}</Td>
                  <Td align="right">{formatNaira(settlement.gratuity_minor)}</Td>
                  <Td align="right">{formatNaira(settlement.outstanding_loan_recovered_minor)}</Td>
                  <Td align="right" className="font-extrabold">
                    {formatNaira(settlement.net_settlement_minor)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
