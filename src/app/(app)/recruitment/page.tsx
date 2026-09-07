"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { departmentsApi, jobPostingsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function RecruitmentPage() {
  const router = useRouter();
  const jobPostings = useApiResource(() => jobPostingsApi.list());
  const departments = useApiResource(() => departmentsApi.list());
  const departmentsById = new Map((departments.data ?? []).map((department) => [department.id, department]));
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Open roles and their candidate pipelines"
        action={<Button onClick={() => setCreating(true)}>New Job Posting</Button>}
      />

      <Card>
        {jobPostings.loading ? <LoadingState /> : null}
        {jobPostings.error ? <ErrorState message={jobPostings.error} /> : null}
        {jobPostings.data && jobPostings.data.length === 0 ? (
          <EmptyState label="No job postings on record yet." />
        ) : null}
        {jobPostings.data && jobPostings.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Title</Th>
                <Th>Department</Th>
                <Th>Status</Th>
                <Th>Opened</Th>
                <Th>Closed</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {jobPostings.data.map((posting) => (
                <tr key={posting.id}>
                  <Td className="font-bold">{posting.title}</Td>
                  <Td>
                    {posting.department_id
                      ? (departmentsById.get(posting.department_id)?.name ?? "—")
                      : "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={posting.status} />
                  </Td>
                  <Td>{formatDate(posting.opened_date)}</Td>
                  <Td>{posting.closed_date ? formatDate(posting.closed_date) : "—"}</Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => router.push(`/recruitment/${posting.id}`)}>
                      View
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewJobPostingDrawer
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/recruitment/${id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function NewJobPostingDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showToast } = useToast();
  const departments = useApiResource(() => departmentsApi.list());
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [openedDate, setOpenedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const posting = await jobPostingsApi.create({
        title,
        department_id: departmentId || null,
        description: description || null,
        opened_date: openedDate,
      });
      showToast("Job posting created", "good");
      onCreated(posting.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Job Posting" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Backend Engineer"
            required
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Select id="department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="">Not specified</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="opened-date">Opened Date</Label>
          <Input
            id="opened-date"
            type="date"
            value={openedDate}
            onChange={(event) => setOpenedDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Job Posting"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
