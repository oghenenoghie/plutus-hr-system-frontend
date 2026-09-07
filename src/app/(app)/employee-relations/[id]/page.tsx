"use client";

import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { disciplinaryCasesApi, employeesApi } from "@/lib/api/endpoints";
import { caseStatusTone } from "@/lib/case-status";
import { formatDate, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { DisciplinaryCaseAction } from "@/lib/types";

const ACTIONS: DisciplinaryCaseAction[] = [
  "none",
  "verbal_warning",
  "written_warning",
  "suspension",
  "termination",
];

export default function DisciplinaryCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { showToast } = useToast();
  const disciplinaryCase = useApiResource(() => disciplinaryCasesApi.get(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));

  const [actionTaken, setActionTaken] = useState<DisciplinaryCaseAction>("verbal_warning");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function resolveCase(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await disciplinaryCasesApi.resolve(id, {
        action_taken: actionTaken,
        resolution_notes: resolutionNotes || null,
      });
      showToast("Case resolved", "good");
      disciplinaryCase.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  const isOpen = disciplinaryCase.data
    ? disciplinaryCase.data.status === "open" || disciplinaryCase.data.status === "under_review"
    : false;

  return (
    <div>
      {disciplinaryCase.loading ? <LoadingState /> : null}
      {disciplinaryCase.error ? <ErrorState message={disciplinaryCase.error} /> : null}
      {disciplinaryCase.data ? (
        <>
          <PageHeader
            title={employeesById.get(disciplinaryCase.data.employee_id)?.full_name ?? "Disciplinary Case"}
            subtitle={`${titleCase(disciplinaryCase.data.category)} · Reported ${formatDate(disciplinaryCase.data.incident_date)}`}
          />

          <Card className="mb-6">
            <div className="flex items-center gap-3">
              <Badge tone={caseStatusTone(disciplinaryCase.data.status)}>
                {disciplinaryCase.data.status.replace(/_/g, " ")}
              </Badge>
              {disciplinaryCase.data.reported_by_id ? (
                <span className="text-[12px] text-ink-soft">
                  Reported by {employeesById.get(disciplinaryCase.data.reported_by_id)?.full_name ?? "—"}
                </span>
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[13px] text-ink-soft">
              {disciplinaryCase.data.description}
            </p>
            {disciplinaryCase.data.action_taken ? (
              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                  Action Taken
                </div>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {titleCase(disciplinaryCase.data.action_taken)}
                  {disciplinaryCase.data.resolution_date
                    ? ` · ${formatDate(disciplinaryCase.data.resolution_date)}`
                    : ""}
                </p>
              </div>
            ) : null}
            {disciplinaryCase.data.resolution_notes ? (
              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                  Resolution Notes
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">
                  {disciplinaryCase.data.resolution_notes}
                </p>
              </div>
            ) : null}
          </Card>

          {isOpen ? (
            <Card>
              <CardHeader title="Resolve Case" />
              <form onSubmit={resolveCase} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="action-taken">Action Taken</Label>
                  <Select
                    id="action-taken"
                    value={actionTaken}
                    onChange={(event) => setActionTaken(event.target.value as DisciplinaryCaseAction)}
                  >
                    {ACTIONS.map((value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="resolution-notes">Resolution Notes</Label>
                  <Textarea
                    id="resolution-notes"
                    value={resolutionNotes}
                    onChange={(event) => setResolutionNotes(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Resolving…" : "Resolve Case"}
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
