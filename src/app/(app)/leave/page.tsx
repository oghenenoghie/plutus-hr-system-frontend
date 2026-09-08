"use client";

import { Fragment, useState } from "react";

import { ApprovalHistoryPanel } from "@/components/approval-history-panel";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { approvalInstancesApi, leaveApi } from "@/lib/api/endpoints";
import { formatDate, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { ApprovalInstance, LeaveRequest } from "@/lib/types";

export default function LeavePage() {
  const requests = useApiResource(() => leaveApi.list());
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, ApprovalInstance | null>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);

  async function decide(request: LeaveRequest, action: "approve" | "reject") {
    try {
      if (action === "approve") await leaveApi.approve(request.id);
      else await leaveApi.reject(request.id);
      showToast(action === "approve" ? "Leave request approved" : "Leave request rejected", "good");
      requests.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function toggleHistory(requestId: string) {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);
    if (history[requestId] === undefined) {
      setLoadingHistoryId(requestId);
      try {
        const result = await approvalInstancesApi.forRequest("leave_request", requestId);
        setHistory((prev) => ({ ...prev, [requestId]: result }));
      } catch (err) {
        showToast(
          err instanceof ApiError ? String(err.detail ?? err.message) : "Failed to load history.",
          "bad",
        );
      } finally {
        setLoadingHistoryId(null);
      }
    }
  }

  return (
    <div>
      <PageHeader title="Leave & Attendance" subtitle="Policies, balances and approvals tied to payroll" />

      <Card>
        {requests.loading ? <LoadingState /> : null}
        {requests.error ? <ErrorState message={requests.error} /> : null}
        {requests.data && requests.data.length === 0 ? (
          <EmptyState label="No leave requests yet." />
        ) : null}
        {requests.data && requests.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Type</Th>
                <Th>Dates</Th>
                <Th align="right">Days</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {requests.data.map((request) => (
                <Fragment key={request.id}>
                  <tr>
                    <Td>{titleCase(request.leave_type)}</Td>
                    <Td>
                      {formatDate(request.start_date)} – {formatDate(request.end_date)}
                    </Td>
                    <Td align="right">{request.days}</Td>
                    <Td className="max-w-xs truncate">{request.reason ?? "—"}</Td>
                    <Td>
                      <StatusBadge status={request.status} />
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        {request.status === "pending" ? (
                          <>
                            <ConfirmActionButton
                              action={() => decide(request, "reject")}
                              label="Reject"
                              confirmTitle="Reject this leave request?"
                              confirmMessage={`${titleCase(request.leave_type)} leave, ${formatDate(request.start_date)} – ${formatDate(request.end_date)} (${request.days} day${request.days === 1 ? "" : "s"}), will be rejected.`}
                              confirmLabel="Reject"
                            />
                            <ConfirmActionButton
                              action={() => decide(request, "approve")}
                              label="Approve"
                              tone="primary"
                              confirmTitle="Approve this leave request?"
                              confirmMessage={`${titleCase(request.leave_type)} leave, ${formatDate(request.start_date)} – ${formatDate(request.end_date)} (${request.days} day${request.days === 1 ? "" : "s"}), will be approved.`}
                              confirmLabel="Approve"
                            />
                          </>
                        ) : null}
                        <Button size="md" variant="secondary" onClick={() => toggleHistory(request.id)}>
                          {expandedId === request.id ? "Hide" : "History"}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                  {expandedId === request.id ? (
                    <tr>
                      <td colSpan={6} className="border-b border-border bg-bg px-4 py-5">
                        <ApprovalHistoryPanel
                          loading={loadingHistoryId === request.id}
                          instance={history[request.id]}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
