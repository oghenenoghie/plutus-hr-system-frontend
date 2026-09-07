"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { statutoryLiabilitiesApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function ReportsPage() {
  const liabilities = useApiResource(() => statutoryLiabilitiesApi.list());

  async function file(id: string) {
    try {
      await statutoryLiabilitiesApi.file(id);
      liabilities.reload();
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.");
    }
  }

  async function remit(id: string) {
    const reference = window.prompt("Remittance reference (optional):") ?? undefined;
    try {
      await statutoryLiabilitiesApi.remit(id, reference || undefined);
      liabilities.reload();
    } catch (err) {
      alert(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.");
    }
  }

  return (
    <div>
      <PageHeader title="Statutory Reports" subtitle="Liabilities and audit-ready filing records by state" />

      <Card>
        {liabilities.loading ? <LoadingState /> : null}
        {liabilities.error ? <ErrorState message={liabilities.error} /> : null}
        {liabilities.data && liabilities.data.length === 0 ? (
          <EmptyState label="No statutory liabilities recorded yet." />
        ) : null}
        {liabilities.data && liabilities.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Scheme</Th>
                <Th>Authority</Th>
                <Th>State</Th>
                <Th>Period</Th>
                <Th align="right">Amount</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {liabilities.data.map((liability) => (
                <tr key={liability.id}>
                  <Td>{liability.scheme.toUpperCase()}</Td>
                  <Td>{liability.authority}</Td>
                  <Td>{liability.state ?? "—"}</Td>
                  <Td>
                    {formatDate(liability.period_start)} – {formatDate(liability.period_end)}
                  </Td>
                  <Td align="right">{formatNaira(liability.amount_minor)}</Td>
                  <Td>{formatDate(liability.due_date)}</Td>
                  <Td>
                    <StatusBadge status={liability.status} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      {liability.status === "pending" ? (
                        <Button size="md" variant="secondary" onClick={() => file(liability.id)}>
                          Mark Filed
                        </Button>
                      ) : null}
                      {liability.status === "filed" ? (
                        <Button size="md" onClick={() => remit(liability.id)}>
                          Mark Remitted
                        </Button>
                      ) : null}
                      {liability.status === "remitted" ? <span className="text-ink-soft">—</span> : null}
                    </div>
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
