"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { attendanceApi } from "@/lib/api/endpoints";
import { formatDateTime, formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState("");
  const records = useApiResource(
    () => (employeeId ? attendanceApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Clock-in / clock-out records by employee" />

      <Card className="mb-6">
        <Label htmlFor="employee">Employee</Label>
        <EmployeePicker value={employeeId} onChange={setEmployeeId} />
      </Card>

      {employeeId ? (
        <Card>
          <CardHeader title="Records" />
          {records.loading ? <LoadingState /> : null}
          {records.error ? <ErrorState message={records.error} /> : null}
          {records.data && records.data.length === 0 ? (
            <EmptyState label="No attendance records for this employee yet." />
          ) : null}
          {records.data && records.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Clock In</Th>
                  <Th>Clock Out</Th>
                </tr>
              </Thead>
              <tbody>
                {[...records.data].reverse().map((record) => (
                  <tr key={record.id}>
                    <Td className="font-bold">{formatDate(record.work_date)}</Td>
                    <Td>{record.clock_in_at ? formatDateTime(record.clock_in_at) : "—"}</Td>
                    <Td>{record.clock_out_at ? formatDateTime(record.clock_out_at) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
