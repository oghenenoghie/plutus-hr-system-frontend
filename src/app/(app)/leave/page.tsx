"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { leaveApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { formatDate, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function LeavePage() {
  const requests = useApiResource(() => leaveApi.list());

  async function decide(id: string, action: "approve" | "reject") {
    try {
      if (action === "approve") await leaveApi.approve(id);
      else await leaveApi.reject(id);
      requests.reload();
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.");
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
                <tr key={request.id}>
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
                    {request.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="md" variant="secondary" onClick={() => decide(request.id, "reject")}>
                          Reject
                        </Button>
                        <Button size="md" onClick={() => decide(request.id, "approve")}>
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
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
