"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Textarea } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  benefitsApi,
  employeesApi,
  expensesApi,
  leaveApi,
  loansApi,
  payRunsApi,
  performanceReviewsApi,
  policiesApi,
} from "@/lib/api/endpoints";
import { formatDate, formatNaira, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { PerformanceReview } from "@/lib/types";

export default function MyWorkspacePage() {
  const employee = useApiResource(() => employeesApi.me());
  const payslips = useApiResource(() => payRunsApi.myPayslips());
  const leaveBalance = useApiResource(() => leaveApi.myBalance());
  const leaveRequests = useApiResource(() => leaveApi.mine());
  const expenses = useApiResource(() => expensesApi.mine());
  const loans = useApiResource(() => loansApi.mine());
  const benefits = useApiResource(() => benefitsApi.mine());
  const policies = useApiResource(() => policiesApi.list());
  const performanceReviews = useApiResource(() => performanceReviewsApi.me());

  const latestPayslip = payslips.data
    ? [...payslips.data].sort((a, b) => (a.period_end < b.period_end ? 1 : -1))[0]
    : undefined;

  return (
    <div>
      <PageHeader title="My Workspace" subtitle="Payslips, leave, expenses, loans and benefits in one place" />

      {employee.loading ? <LoadingState /> : null}
      {employee.error ? <ErrorState message={employee.error} /> : null}
      {employee.data ? (
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <Avatar name={employee.data.full_name} size="lg" />
            <div>
              <div className="text-[15px] font-extrabold text-ink">{employee.data.full_name}</div>
              <div className="text-[12px] text-ink-soft">
                {employee.data.employee_number}
                {employee.data.job_title ? ` · ${employee.data.job_title}` : ""} · {employee.data.state_of_residence}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              {employee.data.tin ? <Badge tone="good">TIN Valid</Badge> : <Badge tone="bad">TIN Missing</Badge>}
              <StatusBadge status={employee.data.lifecycle_state} />
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile
          label="Leave Remaining"
          value={leaveBalance.data ? `${leaveBalance.data.remaining_days}d` : "—"}
          caption={leaveBalance.data ? `of ${leaveBalance.data.entitlement_days}d entitlement` : undefined}
        />
        <KpiTile
          label="Latest Net Pay"
          value={latestPayslip ? formatNaira(latestPayslip.net_minor) : "—"}
          caption={latestPayslip ? formatDate(latestPayslip.period_end) : undefined}
        />
        <KpiTile
          label="Active Loans"
          value={(loans.data ?? []).filter((loan) => loan.status === "active").length.toString()}
        />
        <KpiTile label="Benefits Enrolled" value={(benefits.data ?? []).length.toString()} />
      </div>

      {latestPayslip ? (
        <Card className="mt-6">
          <CardHeader
            title="Latest Payslip"
            subtitle={`${formatDate(latestPayslip.period_start)} – ${formatDate(latestPayslip.period_end)}`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <PayslipFigure label="Gross" value={latestPayslip.gross_minor} />
            <PayslipFigure label="PAYE" value={latestPayslip.paye_minor} />
            <PayslipFigure label="Pension" value={latestPayslip.pension_employee_minor} />
            <PayslipFigure label="NHF" value={latestPayslip.nhf_minor} />
            <PayslipFigure label="Net" value={latestPayslip.net_minor} emphasize />
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Leave Requests" />
          {leaveRequests.loading ? <LoadingState /> : null}
          {leaveRequests.error ? <ErrorState message={leaveRequests.error} /> : null}
          {leaveRequests.data && leaveRequests.data.length === 0 ? <EmptyState label="No leave requests yet." /> : null}
          {leaveRequests.data && leaveRequests.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Dates</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {leaveRequests.data.map((request) => (
                  <tr key={request.id}>
                    <Td>{titleCase(request.leave_type)}</Td>
                    <Td>
                      {formatDate(request.start_date)} – {formatDate(request.end_date)}
                    </Td>
                    <Td>
                      <StatusBadge status={request.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Expense Claims" />
          {expenses.loading ? <LoadingState /> : null}
          {expenses.error ? <ErrorState message={expenses.error} /> : null}
          {expenses.data && expenses.data.length === 0 ? <EmptyState label="No expense claims yet." /> : null}
          {expenses.data && expenses.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Category</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {expenses.data.map((expense) => (
                  <tr key={expense.id}>
                    <Td>{expense.category}</Td>
                    <Td align="right">{formatNaira(expense.amount_minor)}</Td>
                    <Td>
                      <StatusBadge status={expense.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Loans & Advances" />
          {loans.loading ? <LoadingState /> : null}
          {loans.error ? <ErrorState message={loans.error} /> : null}
          {loans.data && loans.data.length === 0 ? <EmptyState label="No loans on record." /> : null}
          {loans.data && loans.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th align="right">Outstanding</Th>
                  <Th align="right">Installment</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {loans.data.map((loan) => (
                  <tr key={loan.id}>
                    <Td align="right">{formatNaira(loan.outstanding_minor)}</Td>
                    <Td align="right">{formatNaira(loan.installment_minor)}</Td>
                    <Td>
                      <StatusBadge status={loan.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Benefits" />
          {benefits.loading ? <LoadingState /> : null}
          {benefits.error ? <ErrorState message={benefits.error} /> : null}
          {benefits.data && benefits.data.length === 0 ? <EmptyState label="No benefits enrolled." /> : null}
          {benefits.data && benefits.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Plan</Th>
                  <Th>Frequency</Th>
                  <Th align="right">Value</Th>
                </tr>
              </Thead>
              <tbody>
                {benefits.data.map((benefit) => (
                  <tr key={benefit.id}>
                    <Td>{benefit.name}</Td>
                    <Td>{titleCase(benefit.frequency)}</Td>
                    <Td align="right">{benefit.value_minor != null ? formatNaira(benefit.value_minor) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Performance Reviews" />
          {performanceReviews.loading ? <LoadingState /> : null}
          {performanceReviews.error ? <ErrorState message={performanceReviews.error} /> : null}
          {performanceReviews.data && performanceReviews.data.length === 0 ? (
            <EmptyState label="No performance reviews on record yet." />
          ) : null}
          {performanceReviews.data && performanceReviews.data.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {performanceReviews.data.map((review) => (
                <PerformanceReviewItem
                  key={review.id}
                  review={review}
                  onAcknowledged={() => performanceReviews.reload()}
                />
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Company Policies" />
          {policies.loading ? <LoadingState /> : null}
          {policies.error ? <ErrorState message={policies.error} /> : null}
          {policies.data && policies.data.length === 0 ? <EmptyState label="No policies published yet." /> : null}
          {policies.data && policies.data.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {policies.data.map((policy) => (
                <li key={policy.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{policy.title}</span>
                    {policy.category ? <Badge>{policy.category}</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{policy.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function PerformanceReviewItem({
  review,
  onAcknowledged,
}: {
  review: PerformanceReview;
  onAcknowledged: () => void;
}) {
  const { showToast } = useToast();
  const [comments, setComments] = useState("");
  const [acknowledging, setAcknowledging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function acknowledge() {
    setSubmitting(true);
    try {
      await performanceReviewsApi.acknowledge(review.id, { employee_comments: comments || null });
      showToast("Review acknowledged", "good");
      onAcknowledged();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-ink">
          {formatDate(review.period_start)} – {formatDate(review.period_end)}
        </span>
        <div className="flex items-center gap-2">
          {review.rating != null ? (
            <span className="text-[12px] text-ink-soft">{review.rating}/5</span>
          ) : null}
          <StatusBadge status={review.status} />
        </div>
      </div>
      {review.manager_comments ? (
        <p className="mt-1 text-[12px] text-ink-soft">{review.manager_comments}</p>
      ) : null}
      {review.status === "submitted" ? (
        acknowledging ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="Optional comments"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button size="md" variant="secondary" onClick={() => setAcknowledging(false)}>
                Cancel
              </Button>
              <Button size="md" onClick={acknowledge} disabled={submitting}>
                {submitting ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <Button size="md" variant="secondary" onClick={() => setAcknowledging(true)}>
              Acknowledge
            </Button>
          </div>
        )
      ) : null}
      {review.employee_comments ? (
        <p className="mt-1 text-[12px] italic text-ink-soft">“{review.employee_comments}”</p>
      ) : null}
    </li>
  );
}

function PayslipFigure({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{label}</div>
      <div className={`mt-1 text-[15px] font-extrabold ${emphasize ? "text-primary" : "text-ink"}`}>
        {formatNaira(value)}
      </div>
    </div>
  );
}
