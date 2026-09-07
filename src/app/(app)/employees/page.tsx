"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { employeesApi } from "@/lib/api/endpoints";
import { formatNaira, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function EmployeesPage() {
  const router = useRouter();
  const employees = useApiResource(() => employeesApi.list());

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Directory, TIN status and pay components"
        action={<Button onClick={() => router.push("/employees/new")}>New Employee</Button>}
      />

      <Card>
        {employees.loading ? <LoadingState /> : null}
        {employees.error ? <ErrorState message={employees.error} /> : null}
        {employees.data && employees.data.length === 0 ? (
          <EmptyState label="No employees on record yet." />
        ) : null}
        {employees.data && employees.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>State</Th>
                <Th>Type</Th>
                <Th>TIN</Th>
                <Th align="right">Gross / Period</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <tbody>
              {employees.data.map((employee) => {
                const grossMinor =
                  employee.basic_minor + employee.housing_minor + employee.transport_minor + employee.other_earnings_minor;
                return (
                  <tr key={employee.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={employee.full_name} />
                        <div>
                          <div className="font-bold">{employee.full_name}</div>
                          <div className="text-[11px] text-ink-soft">
                            {employee.employee_number}
                            {employee.job_title ? ` · ${employee.job_title}` : ""}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>{employee.state_of_residence}</Td>
                    <Td>{titleCase(employee.employment_type)}</Td>
                    <Td>
                      {employee.tin ? (
                        <Badge tone="good">Valid</Badge>
                      ) : (
                        <Badge tone="bad">Missing</Badge>
                      )}
                    </Td>
                    <Td align="right">{formatNaira(grossMinor)}</Td>
                    <Td>
                      <StatusBadge status={employee.lifecycle_state} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
