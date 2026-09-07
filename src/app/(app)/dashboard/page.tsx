"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { dashboardApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function DashboardPage() {
  const summary = useApiResource(() => dashboardApi.summary());
  const deadlines = useApiResource(() => dashboardApi.deadlines(30));

  return (
    <div>
      <PageHeader title="Overview" subtitle="Workforce, payroll and compliance at a glance" />

      {summary.loading ? <LoadingState /> : null}
      {summary.error ? <ErrorState message={summary.error} /> : null}

      {summary.data ? (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile label="Active Employees" value={summary.data.active_employee_count.toLocaleString("en-NG")} />
          <KpiTile
            label="Outstanding Liability"
            value={formatNaira(summary.data.outstanding_liability_minor)}
          />
          <KpiTile
            label="Pending Leave Requests"
            value={summary.data.pending_leave_request_count.toLocaleString("en-NG")}
          />
          <KpiTile
            label="Pending Expenses"
            value={summary.data.pending_expense_count.toLocaleString("en-NG")}
          />
        </div>
      ) : null}

      {summary.data?.last_completed_pay_run ? (
        <Card className="mb-8">
          <CardHeader
            title="Last Completed Pay Run"
            subtitle={`${formatDate(summary.data.last_completed_pay_run.period_start)} – ${formatDate(summary.data.last_completed_pay_run.period_end)}`}
          />
          <div className="grid grid-cols-3 gap-4 text-[13px]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Employees</div>
              <div className="mt-1 font-extrabold">{summary.data.last_completed_pay_run.employee_count}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Gross</div>
              <div className="mt-1 font-extrabold">{formatNaira(summary.data.last_completed_pay_run.gross_minor)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Net</div>
              <div className="mt-1 font-extrabold">{formatNaira(summary.data.last_completed_pay_run.net_minor)}</div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Upcoming Statutory Deadlines" subtitle="Filings and remittances due within 30 days" />
        {deadlines.loading ? <LoadingState /> : null}
        {deadlines.error ? <ErrorState message={deadlines.error} /> : null}
        {deadlines.data && deadlines.data.length === 0 ? (
          <EmptyState label="No deadlines due within the next 30 days." />
        ) : null}
        {deadlines.data && deadlines.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Scheme</Th>
                <Th>Authority</Th>
                <Th>State</Th>
                <Th align="right">Amount</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <tbody>
              {deadlines.data.map((liability) => (
                <tr key={liability.id}>
                  <Td>{liability.scheme.toUpperCase()}</Td>
                  <Td>{liability.authority}</Td>
                  <Td>{liability.state ?? "—"}</Td>
                  <Td align="right">{formatNaira(liability.amount_minor)}</Td>
                  <Td>{formatDate(liability.due_date)}</Td>
                  <Td>
                    <StatusBadge status={liability.status} />
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
