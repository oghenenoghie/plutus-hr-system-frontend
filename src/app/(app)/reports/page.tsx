"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { statutoryLiabilitiesApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { StatutoryLiability } from "@/lib/types";

export default function ReportsPage() {
  const liabilities = useApiResource(() => statutoryLiabilitiesApi.list());
  const { showToast } = useToast();
  const [remitting, setRemitting] = useState<StatutoryLiability | null>(null);

  async function file(liability: StatutoryLiability) {
    try {
      await statutoryLiabilitiesApi.file(liability.id);
      showToast(`${liability.scheme.toUpperCase()} marked filed`, "good");
      liabilities.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
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
                        <ConfirmActionButton
                          action={() => file(liability)}
                          label="Mark Filed"
                          tone="primary"
                          confirmTitle="Mark this liability as filed?"
                          confirmMessage={`${liability.scheme.toUpperCase()} for ${formatDate(liability.period_start)} – ${formatDate(liability.period_end)} (${formatNaira(liability.amount_minor)}) will be marked filed with ${liability.authority}.`}
                          confirmLabel="Mark Filed"
                        />
                      ) : null}
                      {liability.status === "filed" ? (
                        <Button size="md" onClick={() => setRemitting(liability)}>
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

      {remitting ? (
        <RemitDrawer
          liability={remitting}
          onClose={() => setRemitting(null)}
          onRemitted={() => {
            setRemitting(null);
            liabilities.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function RemitDrawer({
  liability,
  onClose,
  onRemitted,
}: {
  liability: StatutoryLiability;
  onClose: () => void;
  onRemitted: () => void;
}) {
  const { showToast } = useToast();
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await statutoryLiabilitiesApi.remit(liability.id, reference || undefined);
      showToast(`${liability.scheme.toUpperCase()} marked remitted`, "good");
      onRemitted();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Mark as Remitted" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          {liability.scheme.toUpperCase()} for {formatDate(liability.period_start)} –{" "}
          {formatDate(liability.period_end)} ({formatNaira(liability.amount_minor)}), payable to{" "}
          {liability.authority}.
        </p>
        <div>
          <Label htmlFor="reference">Remittance Reference</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Marking…" : "Mark Remitted"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
