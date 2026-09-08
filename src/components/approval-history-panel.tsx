import { StatusBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { formatDateTime, titleCase } from "@/lib/format";
import type { ApprovalInstance } from "@/lib/types";

// Shared by every page with an approvable request (Leave, Expenses, Bills)
// so the "History" expansion looks and behaves identically everywhere,
// reusing the same expandable-row interaction this session already
// established on Payroll Runs and Contractors.
export function ApprovalHistoryPanel({
  loading,
  instance,
}: {
  loading: boolean;
  instance: ApprovalInstance | null | undefined;
}) {
  if (loading) return <LoadingState />;
  if (!instance || instance.decisions.length === 0) {
    return <p className="text-[13px] text-ink-soft">No approval history yet.</p>;
  }

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Step</Th>
          <Th>Decision</Th>
          <Th>Decided By</Th>
          <Th>Comment</Th>
          <Th>When</Th>
        </tr>
      </Thead>
      <tbody>
        {instance.decisions.map((decision) => (
          <tr key={decision.id}>
            <Td>{decision.step_order}</Td>
            <Td>
              <StatusBadge status={decision.decision === "approve" ? "approved" : "rejected"} />
            </Td>
            <Td>{decision.decided_by_role ? titleCase(decision.decided_by_role) : "—"}</Td>
            <Td className="max-w-xs truncate">{decision.comment ?? "—"}</Td>
            <Td>{formatDateTime(decision.created_at)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
