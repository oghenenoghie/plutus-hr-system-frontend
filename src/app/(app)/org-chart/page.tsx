"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { departmentsApi, employeesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { Department, Employee } from "@/lib/types";

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

// Employees form a tree via manager_id. A missing/unknown/cyclic manager_id
// makes an employee a root rather than getting dropped — every employee
// must appear somewhere in the chart.
function buildForest(employees: Employee[]): TreeNode[] {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const childrenByManager = new Map<string, Employee[]>();
  const roots: Employee[] = [];

  for (const employee of employees) {
    if (employee.manager_id && byId.has(employee.manager_id) && employee.manager_id !== employee.id) {
      const siblings = childrenByManager.get(employee.manager_id) ?? [];
      siblings.push(employee);
      childrenByManager.set(employee.manager_id, siblings);
    } else {
      roots.push(employee);
    }
  }

  const visited = new Set<string>();
  function toNode(employee: Employee): TreeNode {
    visited.add(employee.id);
    const children = (childrenByManager.get(employee.id) ?? [])
      .filter((child) => !visited.has(child.id))
      .map(toNode);
    return { employee, children };
  }

  return roots.map(toNode);
}

export default function OrgChartPage() {
  const employees = useApiResource(() => employeesApi.list());
  const departments = useApiResource(() => departmentsApi.list());
  const departmentsById = new Map((departments.data ?? []).map((department) => [department.id, department]));

  const forest = employees.data ? buildForest(employees.data) : null;

  return (
    <div>
      <PageHeader title="Org Chart" subtitle="Reporting lines, built from each employee's manager" />

      <Card>
        {employees.loading ? <LoadingState /> : null}
        {employees.error ? <ErrorState message={employees.error} /> : null}
        {forest && forest.length === 0 ? <EmptyState label="No employees on record yet." /> : null}
        {forest && forest.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {forest.map((node) => (
              <TreeItem key={node.employee.id} node={node} departmentsById={departmentsById} />
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

function TreeItem({
  node,
  departmentsById,
}: {
  node: TreeNode;
  departmentsById: Map<string, Department>;
}) {
  const { employee, children } = node;
  const department = employee.department_id ? departmentsById.get(employee.department_id) : undefined;

  return (
    <li>
      <div className="flex items-center gap-2.5 py-1.5">
        <Avatar name={employee.full_name} />
        <div>
          <div className="text-[13px] font-bold text-ink">{employee.full_name}</div>
          <div className="text-[11px] text-ink-soft">
            {employee.job_title ?? employee.employee_number}
            {department ? ` · ${department.name}` : ""}
          </div>
        </div>
      </div>
      {children.length > 0 ? (
        <ul className="ml-4 flex flex-col gap-1 border-l border-border pl-4">
          {children.map((child) => (
            <TreeItem key={child.employee.id} node={child} departmentsById={departmentsById} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
