"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { expensesApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { ExpenseStatus } from "@/lib/types";

const NEXT_ACTION: Partial<Record<ExpenseStatus, { label: string; run: (id: string) => Promise<unknown> }>> = {
  pending: { label: "Approve", run: (id) => expensesApi.approve(id) },
  approved: { label: "Reimburse", run: (id) => expensesApi.reimburse(id) },
};

export default function ExpensesPage() {
  const expenses = useApiResource(() => expensesApi.list());

  async function act(id: string, run: (id: string) => Promise<unknown>) {
    try {
      await run(id);
      expenses.reload();
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.");
    }
  }

  async function reject(id: string) {
    try {
      await expensesApi.reject(id);
      expenses.reload();
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.");
    }
  }

  return (
    <div>
      <PageHeader title="Expense Reimbursement" subtitle="Claims, approvals and taxable/non-taxable handling" />

      <Card>
        {expenses.loading ? <LoadingState /> : null}
        {expenses.error ? <ErrorState message={expenses.error} /> : null}
        {expenses.data && expenses.data.length === 0 ? (
          <EmptyState label="No expense claims yet." />
        ) : null}
        {expenses.data && expenses.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Date</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {expenses.data.map((expense) => {
                const next = NEXT_ACTION[expense.status];
                return (
                  <tr key={expense.id}>
                    <Td>{expense.category}</Td>
                    <Td className="max-w-xs truncate">{expense.description}</Td>
                    <Td>{formatDate(expense.expense_date)}</Td>
                    <Td align="right">{formatNaira(expense.amount_minor)}</Td>
                    <Td>
                      <StatusBadge status={expense.status} />
                    </Td>
                    <Td align="right">
                      {next ? (
                        <div className="flex justify-end gap-2">
                          {expense.status === "pending" ? (
                            <Button size="md" variant="secondary" onClick={() => reject(expense.id)}>
                              Reject
                            </Button>
                          ) : null}
                          <Button size="md" onClick={() => act(expense.id, next.run)}>
                            {next.label}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
