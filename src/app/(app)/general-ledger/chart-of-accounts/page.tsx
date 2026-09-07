"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { chartAccountsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { AccountType, ChartAccount } from "@/lib/types";

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
};

export default function ChartOfAccountsPage() {
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function seedDefaults() {
    setSeeding(true);
    try {
      await chartAccountsApi.seedDefaults();
      showToast("Default chart of accounts created", "good");
      accounts.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSeeding(false);
    }
  }

  async function toggleActive(account: ChartAccount) {
    try {
      await chartAccountsApi.update(account.id, { is_active: !account.is_active });
      accounts.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        subtitle="The account codes payroll and manual journal entries post against"
        action={
          <div className="flex gap-3">
            <Link href="/general-ledger">
              <Button variant="secondary">Back to Ledger</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Account</Button>
          </div>
        }
      />

      <Card>
        {accounts.loading ? <LoadingState /> : null}
        {accounts.error ? <ErrorState message={accounts.error} /> : null}
        {accounts.data && accounts.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <EmptyState label="No chart of accounts yet." />
            <Button onClick={seedDefaults} disabled={seeding}>
              {seeding ? "Seeding…" : "Seed Default Accounts"}
            </Button>
          </div>
        ) : null}
        {accounts.data && accounts.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Source</Th>
                <Th align="right">Status</Th>
              </tr>
            </Thead>
            <tbody>
              {accounts.data.map((account) => (
                <tr key={account.id}>
                  <Td className="font-mono text-[12px]">{account.code}</Td>
                  <Td className="font-bold">{account.name}</Td>
                  <Td>{TYPE_LABELS[account.type]}</Td>
                  <Td>{account.is_system ? "Default" : "Custom"}</Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() => toggleActive(account)}
                      className="inline-flex"
                    >
                      <Badge tone={account.is_active ? "good" : "neutral"}>
                        {account.is_active ? "active" : "inactive"}
                      </Badge>
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewAccountDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            accounts.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewAccountDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await chartAccountsApi.create({ code, name, type });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Account" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="e.g. accounts_receivable"
            required
          />
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Accounts Receivable"
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" value={type} onChange={(event) => setType(event.target.value as AccountType)}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Account"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
