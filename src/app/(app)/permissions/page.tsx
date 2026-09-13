"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { membershipsApi } from "@/lib/api/endpoints";
import { titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Permission } from "@/lib/types";

const ALL_PERMISSIONS: Permission[] = [
  "employees.view",
  "employees.manage",
  "payroll.run",
  "payroll.approve",
  "accounting.manage",
  "recruitment.manage",
  "performance.manage",
  "reports.view",
  "settings.manage",
];

export default function PermissionsPage() {
  const memberships = useApiResource(() => membershipsApi.list());
  const [membershipId, setMembershipId] = useState("");
  const selected = (memberships.data ?? []).find((m) => m.id === membershipId) ?? null;

  return (
    <div>
      <PageHeader
        title="Permissions"
        subtitle="Fine-grained permission overrides layered on top of each membership's role"
      />

      <Card className="mb-6">
        {memberships.loading ? <LoadingState /> : null}
        {memberships.error ? <ErrorState message={memberships.error} /> : null}
        {memberships.data && memberships.data.length > 0 ? (
          <div>
            <Select id="membership" value={membershipId} onChange={(event) => setMembershipId(event.target.value)}>
              <option value="">Select a member</option>
              {memberships.data.map((membership) => (
                <option key={membership.id} value={membership.id}>
                  {membership.email} · {titleCase(membership.role)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </Card>

      {selected ? <MembershipPermissions membershipId={selected.id} role={selected.role} /> : null}
    </div>
  );
}

function MembershipPermissions({ membershipId, role }: { membershipId: string; role: string }) {
  const { showToast } = useToast();
  const effective = useApiResource(() => membershipsApi.effectivePermissions(membershipId), [membershipId]);
  const [pendingPermission, setPendingPermission] = useState<Permission | null>(null);

  const granted = new Set(effective.data?.permissions ?? []);

  async function toggle(permission: Permission, isGranted: boolean) {
    setPendingPermission(permission);
    try {
      await membershipsApi.setOverride(membershipId, { permission, granted: !isGranted });
      effective.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setPendingPermission(null);
    }
  }

  async function resetToDefault(permission: Permission) {
    setPendingPermission(permission);
    try {
      await membershipsApi.clearOverride(membershipId, permission);
      effective.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setPendingPermission(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Effective Permissions"
        subtitle={`Base role: ${titleCase(role)} — toggling here adds a per-membership override, it doesn't change the role`}
      />
      {effective.loading ? <LoadingState /> : null}
      {effective.error ? <ErrorState message={effective.error} /> : null}
      {effective.data ? (
        <div className="flex flex-col gap-2">
          {ALL_PERMISSIONS.map((permission) => {
            const isGranted = granted.has(permission);
            return (
              <div
                key={permission}
                className="flex items-center justify-between rounded-panel border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-ink">{permission}</span>
                  <Badge tone={isGranted ? "good" : "neutral"}>{isGranted ? "Granted" : "Not granted"}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={pendingPermission === permission}
                    onClick={() => resetToDefault(permission)}
                  >
                    Reset to Default
                  </Button>
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={pendingPermission === permission}
                    onClick={() => toggle(permission, isGranted)}
                  >
                    {isGranted ? "Revoke" : "Grant"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {effective.data && effective.data.permissions.length === 0 ? (
        <EmptyState label="No permissions granted to this membership." />
      ) : null}
    </Card>
  );
}
