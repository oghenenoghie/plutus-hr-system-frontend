"use client";

import { use, useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { companyAssetsApi, employeesApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const asset = useApiResource(() => companyAssetsApi.get(id), [id]);
  const assignments = useApiResource(() => companyAssetsApi.assignments(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const [assigning, setAssigning] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [conditionNotes, setConditionNotes] = useState("");
  const [returning, setReturning] = useState(false);

  async function submitReturn(assignmentId: string) {
    setReturning(true);
    try {
      await companyAssetsApi.returnAssignment(assignmentId, {
        returned_date: new Date().toISOString().slice(0, 10),
        condition_notes: conditionNotes || null,
      });
      showToast("Asset returned", "good");
      setReturningId(null);
      setConditionNotes("");
      asset.reload();
      assignments.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setReturning(false);
    }
  }

  return (
    <div>
      {asset.loading ? <LoadingState /> : null}
      {asset.error ? <ErrorState message={asset.error} /> : null}
      {asset.data ? (
        <>
          <PageHeader
            title={asset.data.name}
            subtitle={`${asset.data.asset_tag} · ${titleCase(asset.data.category)}`}
            action={
              asset.data.status === "available" ? (
                <Button onClick={() => setAssigning(true)}>Assign to Employee</Button>
              ) : undefined
            }
          />

          <Card className="mb-6">
            <div className="flex items-center gap-3">
              <StatusBadge status={asset.data.status} />
              {asset.data.purchase_date ? (
                <span className="text-[12px] text-ink-soft">
                  Purchased {formatDate(asset.data.purchase_date)}
                  {asset.data.purchase_value_minor != null
                    ? ` · ${formatNaira(asset.data.purchase_value_minor)}`
                    : ""}
                </span>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Assignment History" />
            {assignments.loading ? <LoadingState /> : null}
            {assignments.error ? <ErrorState message={assignments.error} /> : null}
            {assignments.data && assignments.data.length === 0 ? (
              <EmptyState label="This asset has never been assigned." />
            ) : null}
            {assignments.data && assignments.data.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Assigned</Th>
                    <Th>Returned</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </Thead>
                <tbody>
                  {assignments.data.map((assignment) => (
                    <tr key={assignment.id}>
                      <Td className="font-bold">
                        {employeesById.get(assignment.employee_id)?.full_name ?? "—"}
                      </Td>
                      <Td>{formatDate(assignment.assigned_date)}</Td>
                      <Td>
                        {assignment.returned_date ? formatDate(assignment.returned_date) : "—"}
                      </Td>
                      <Td align="right">
                        {!assignment.returned_date ? (
                          returningId === assignment.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                value={conditionNotes}
                                onChange={(event) => setConditionNotes(event.target.value)}
                                placeholder="Condition notes (optional)"
                                className="w-56"
                              />
                              <Button
                                size="md"
                                onClick={() => submitReturn(assignment.id)}
                                disabled={returning}
                              >
                                {returning ? "Saving…" : "Confirm"}
                              </Button>
                              <Button
                                size="md"
                                variant="secondary"
                                onClick={() => {
                                  setReturningId(null);
                                  setConditionNotes("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button size="md" variant="secondary" onClick={() => setReturningId(assignment.id)}>
                              Mark Returned
                            </Button>
                          )
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </Card>

          {assigning ? (
            <AssignAssetDrawer
              assetId={id}
              onClose={() => setAssigning(false)}
              onAssigned={() => {
                setAssigning(false);
                asset.reload();
                assignments.reload();
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function AssignAssetDrawer({
  assetId,
  onClose,
  onAssigned,
}: {
  assetId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { showToast } = useToast();
  const [employeeId, setEmployeeId] = useState("");
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await companyAssetsApi.assign(assetId, { employee_id: employeeId, assigned_date: assignedDate });
      showToast("Asset assigned", "good");
      onAssigned();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Assign to Employee" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="employee">Employee</Label>
          <EmployeePicker value={employeeId} onChange={setEmployeeId} />
        </div>
        <div>
          <Label htmlFor="assigned-date">Assigned Date</Label>
          <Input
            id="assigned-date"
            type="date"
            value={assignedDate}
            onChange={(event) => setAssignedDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !employeeId}>
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
