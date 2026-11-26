"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { loansApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function LoansPage() {
  const { showToast } = useToast();
  const loans = useApiResource(() => loansApi.list());

  async function decide(loanId: string, approve: boolean) {
    try {
      if (approve) await loansApi.approve(loanId);
      else await loansApi.reject(loanId);
      showToast(approve ? "Loan approved" : "Loan rejected", "good");
      loans.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function cancel(loanId: string) {
    try {
      await loansApi.cancel(loanId);
      loans.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  const pending = (loans.data ?? []).filter((loan) => loan.status === "pending");

  return (
    <div>
      <PageHeader title="Loans & Advances" subtitle="Review employee requests, repayment schedules and payroll deductions" />

      <Card className="mb-6">
        <CardHeader title="Pending Approval" />
        {loans.loading ? <LoadingState /> : null}
        {loans.error ? <ErrorState message={loans.error} /> : null}
        {!loans.loading && !loans.error && pending.length === 0 ? (
          <EmptyState label="There are no loan requests awaiting approval." />
        ) : null}
        {pending.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pending.map((loan) => (
              <div key={loan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border p-3">
                <div>
                  <div className="font-bold text-ink">{formatMoney(loan.principal_minor)} request</div>
                  <div className="text-[11px] text-ink-soft">Employee {loan.employee_id} · {loan.num_installments} installments · Starts {formatDate(loan.start_date)}</div>
                  <div className="mt-1 text-[11px] text-ink-soft">Installment: {formatMoney(loan.installment_minor)}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="md" onClick={() => decide(loan.id, true)}>Approve</Button>
                  <Button size="md" variant="danger" onClick={() => decide(loan.id, false)}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Loan Records" />
        {loans.loading ? <LoadingState /> : null}
        {loans.error ? <ErrorState message={loans.error} /> : null}
        {loans.data && loans.data.length === 0 ? <EmptyState label="No loans on record." /> : null}
        {loans.data && loans.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>Start</Th>
                <Th align="right">Principal</Th>
                <Th align="right">Installment</Th>
                <Th align="right">Installments</Th>
                <Th align="right">Outstanding</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {loans.data.map((loan) => (
                <tr key={loan.id}>
                  <Td><span className="text-[11px]">{loan.employee_id}</span></Td>
                  <Td>{formatDate(loan.start_date)}</Td>
                  <Td align="right">{formatMoney(loan.principal_minor)}</Td>
                  <Td align="right">{formatMoney(loan.installment_minor)}</Td>
                  <Td align="right">{loan.num_installments}</Td>
                  <Td align="right">{formatMoney(loan.outstanding_minor)}</Td>
                  <Td><StatusBadge status={loan.status} /></Td>
                  <Td align="right">
                    {loan.status === "active" ? (
                      <ConfirmActionButton action={() => cancel(loan.id)} label="Cancel" tone="danger" confirmTitle="Cancel this loan?" confirmMessage="This stops future installment deductions for this loan." confirmLabel="Cancel Loan" />
                    ) : null}
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
