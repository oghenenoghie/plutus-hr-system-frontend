"use client";

import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi, trainingCoursesApi, trainingEnrollmentsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { TrainingEnrollmentStatus } from "@/lib/types";

const ENROLLMENT_STATUSES: TrainingEnrollmentStatus[] = [
  "enrolled",
  "in_progress",
  "completed",
  "failed",
];

export default function TrainingCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { showToast } = useToast();
  const course = useApiResource(() => trainingCoursesApi.get(id), [id]);
  const enrollments = useApiResource(() => trainingCoursesApi.enrollments(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const [enrolling, setEnrolling] = useState(false);

  async function updateEnrollment(enrollmentId: string, status: TrainingEnrollmentStatus) {
    try {
      await trainingEnrollmentsApi.update(enrollmentId, {
        status,
        completed_date:
          status === "completed" ? new Date().toISOString().slice(0, 10) : undefined,
      });
      showToast("Enrollment updated", "good");
      enrollments.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function updateScore(enrollmentId: string, score: string) {
    try {
      await trainingEnrollmentsApi.update(enrollmentId, {
        score: score ? Number(score) : null,
      });
      enrollments.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      {course.loading ? <LoadingState /> : null}
      {course.error ? <ErrorState message={course.error} /> : null}
      {course.data ? (
        <>
          <PageHeader
            title={course.data.title}
            subtitle={
              [course.data.provider, course.data.duration_hours != null ? `${course.data.duration_hours}h` : null]
                .filter(Boolean)
                .join(" · ") || "No provider or duration recorded"
            }
          />

          {course.data.description ? (
            <Card className="mb-6">
              <p className="whitespace-pre-wrap text-[13px] text-ink-soft">{course.data.description}</p>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Enrollments" action={<Button onClick={() => setEnrolling(true)}>Enroll Employee</Button>} />
            {enrollments.loading ? <LoadingState /> : null}
            {enrollments.error ? <ErrorState message={enrollments.error} /> : null}
            {enrollments.data && enrollments.data.length === 0 ? (
              <EmptyState label="No enrollments yet." />
            ) : null}
            {enrollments.data && enrollments.data.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Enrolled</Th>
                    <Th>Completed</Th>
                    <Th>Status</Th>
                    <Th align="right">Score</Th>
                  </tr>
                </Thead>
                <tbody>
                  {enrollments.data.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <Td className="font-bold">
                        {employeesById.get(enrollment.employee_id)?.full_name ?? "—"}
                      </Td>
                      <Td>{formatDate(enrollment.enrolled_date)}</Td>
                      <Td>{enrollment.completed_date ? formatDate(enrollment.completed_date) : "—"}</Td>
                      <Td>
                        <Select
                          value={enrollment.status}
                          onChange={(event) =>
                            updateEnrollment(enrollment.id, event.target.value as TrainingEnrollmentStatus)
                          }
                          className="w-auto"
                        >
                          {ENROLLMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td align="right">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={enrollment.score ?? ""}
                          onBlur={(event) => updateScore(enrollment.id, event.target.value)}
                          className="w-20 text-right"
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </Card>

          {enrolling ? (
            <EnrollEmployeeDrawer
              courseId={id}
              onClose={() => setEnrolling(false)}
              onEnrolled={() => {
                setEnrolling(false);
                enrollments.reload();
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function EnrollEmployeeDrawer({
  courseId,
  onClose,
  onEnrolled,
}: {
  courseId: string;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const { showToast } = useToast();
  const employees = useApiResource(() => employeesApi.list());
  const [employeeId, setEmployeeId] = useState("");
  const [enrolledDate, setEnrolledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await trainingCoursesApi.enroll(courseId, {
        employee_id: employeeId,
        enrolled_date: enrolledDate,
      });
      showToast("Employee enrolled", "good");
      onEnrolled();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Enroll Employee" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="employee">Employee</Label>
          <Select
            id="employee"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            required
          >
            <option value="">Select an employee</option>
            {(employees.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="enrolled-date">Enrolled Date</Label>
          <Input
            id="enrolled-date"
            type="date"
            value={enrolledDate}
            onChange={(event) => setEnrolledDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enrolling…" : "Enroll"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
