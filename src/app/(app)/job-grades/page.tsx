"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { jobGradesApi } from "@/lib/api/endpoints";
import { currencyLabel, formatMoney, fromMinorUnits, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { JobGrade } from "@/lib/types";

export default function JobGradesPage() {
  const jobGrades = useApiResource(() => jobGradesApi.list());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<JobGrade | null>(null);
  const [search, setSearch] = useState("");
  const gradeList = jobGrades.data ?? [];
  const salaryBandCount = gradeList.filter((grade) => grade.min_salary_minor != null || grade.max_salary_minor != null).length;
  const filteredGrades = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return gradeList.filter((grade) => !term || grade.name.toLocaleLowerCase().includes(term) || String(grade.level ?? "").includes(term));
  }, [gradeList, search]);

  return (
    <div>
      <PageHeader
        title="Job Grades"
        subtitle="Salary bands and levels employees can be assigned to"
        action={<Button onClick={() => setCreating(true)}>New Job Grade</Button>}
      />

      <section aria-label="Job grade overview" className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Job grades</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{gradeList.length}</p><p className="mt-1 text-[12px] text-ink-soft">Defined levels</p></Card>
        <Card className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Salary bands</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{salaryBandCount}</p><p className="mt-1 text-[12px] text-ink-soft">Grades with a configured range</p></Card>
        <Card className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">No salary band</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{gradeList.length - salaryBandCount}</p><p className="mt-1 text-[12px] text-ink-soft">Grades without a configured range</p></Card>
      </section>
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search job grade or level" aria-label="Search job grades by name or level" /></div>
          <div className="flex items-center justify-between gap-3"><span className="whitespace-nowrap text-[12px] font-bold text-ink-soft" aria-live="polite">{filteredGrades.length} of {gradeList.length} grades</span>{search ? <Button size="md" variant="ghost" onClick={() => setSearch("")}>Clear search</Button> : null}</div>
        </div>
      </Card>
      <Card>
        {jobGrades.loading ? <LoadingState /> : null}
        {jobGrades.error ? <ErrorState message={jobGrades.error} /> : null}
        {jobGrades.data && jobGrades.data.length === 0 ? (
          <EmptyState label="No job grades on record yet." />
        ) : null}
        {jobGrades.data && gradeList.length > 0 && filteredGrades.length === 0 ? (
          <EmptyState label="No job grades match your search. Try another name or level, or clear the search." />
        ) : null}
        {jobGrades.data && filteredGrades.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Level</Th>
                <Th align="right">Salary Band</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {filteredGrades.map((jobGrade) => (
                <tr key={jobGrade.id}>
                  <Td className="font-bold">{jobGrade.name}</Td>
                  <Td>{jobGrade.level ?? "—"}</Td>
                  <Td align="right">
                    {jobGrade.min_salary_minor == null && jobGrade.max_salary_minor == null
                      ? "—"
                      : `${jobGrade.min_salary_minor != null ? formatMoney(jobGrade.min_salary_minor) : "—"} – ${
                          jobGrade.max_salary_minor != null ? formatMoney(jobGrade.max_salary_minor) : "—"
                        }`}
                  </Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => setEditing(jobGrade)}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <JobGradeModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            jobGrades.reload();
          }}
        />
      ) : null}

      {editing ? (
        <JobGradeModal
          jobGrade={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            jobGrades.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function JobGradeModal({
  jobGrade,
  onClose,
  onSaved,
}: {
  jobGrade?: JobGrade;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(jobGrade?.name ?? "");
  const [level, setLevel] = useState(jobGrade?.level != null ? String(jobGrade.level) : "");
  const [minSalary, setMinSalary] = useState(
    jobGrade?.min_salary_minor != null ? String(Math.round(fromMinorUnits(jobGrade.min_salary_minor))) : "",
  );
  const [maxSalary, setMaxSalary] = useState(
    jobGrade?.max_salary_minor != null ? String(Math.round(fromMinorUnits(jobGrade.max_salary_minor))) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name,
        level: level ? Number(level) : null,
        min_salary_minor: minSalary ? toMinorUnits(minSalary) : null,
        max_salary_minor: maxSalary ? toMinorUnits(maxSalary) : null,
      };
      if (jobGrade) {
        await jobGradesApi.update(jobGrade.id, body);
        showToast("Job grade updated", "good");
      } else {
        await jobGradesApi.create(body);
        showToast("Job grade created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={jobGrade ? "Edit Job Grade" : "New Job Grade"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. L1, Senior"
            required
          />
        </div>
        <div>
          <Label htmlFor="level">Level (sort order)</Label>
          <Input
            id="level"
            type="number"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="min-salary">Minimum Salary ({currencyLabel()}/month)</Label>
          <Input
            id="min-salary"
            inputMode="decimal"
            value={minSalary}
            onChange={(event) => setMinSalary(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="max-salary">Maximum Salary ({currencyLabel()}/month)</Label>
          <Input
            id="max-salary"
            inputMode="decimal"
            value={maxSalary}
            onChange={(event) => setMaxSalary(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : jobGrade ? "Save Changes" : "Create Job Grade"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
