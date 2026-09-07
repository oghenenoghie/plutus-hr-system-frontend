"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { loansApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function LoansPage() {
  const loans = useApiResource(() => loansApi.list());

  return (
    <div>
      <PageHeader title="Loans & Advances" subtitle="Requests, repayment schedules and payroll deductions" />

      <Card>
        {loans.loading ? <LoadingState /> : null}
        {loans.error ? <ErrorState message={loans.error} /> : null}
        {loans.data && loans.data.length === 0 ? <EmptyState label="No loans on record." /> : null}
        {loans.data && loans.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Start</Th>
                <Th align="right">Principal</Th>
                <Th align="right">Installment</Th>
                <Th align="right">Installments</Th>
                <Th align="right">Outstanding</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <tbody>
              {loans.data.map((loan) => (
                <tr key={loan.id}>
                  <Td>{formatDate(loan.start_date)}</Td>
                  <Td align="right">{formatNaira(loan.principal_minor)}</Td>
                  <Td align="right">{formatNaira(loan.installment_minor)}</Td>
                  <Td align="right">{loan.num_installments}</Td>
                  <Td align="right">{formatNaira(loan.outstanding_minor)}</Td>
                  <Td>
                    <StatusBadge status={loan.status} />
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
