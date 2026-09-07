"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { chartAccountsApi, customersApi, invoicesApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Invoice } from "@/lib/types";

export default function InvoicesPage() {
  const invoices = useApiResource(() => invoicesApi.list());
  const customers = useApiResource(() => customersApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);

  const customerNameById = new Map(
    (customers.data ?? []).map((customer) => [customer.id, customer.name]),
  );

  async function act(action: (id: string) => Promise<Invoice>, invoice: Invoice) {
    try {
      await action(invoice.id);
      invoices.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Accounts receivable — money owed to this org by its customers"
        action={
          <div className="flex gap-3">
            <Link href="/invoices/customers">
              <Button variant="secondary">Customers</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Invoice</Button>
          </div>
        }
      />

      <Card>
        {invoices.loading ? <LoadingState /> : null}
        {invoices.error ? <ErrorState message={invoices.error} /> : null}
        {invoices.data && invoices.data.length === 0 ? <EmptyState label="No invoices yet." /> : null}
        {invoices.data && invoices.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Invoice #</Th>
                <Th>Customer</Th>
                <Th>Due</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {invoices.data.map((invoice) => (
                <tr key={invoice.id}>
                  <Td className="font-bold">{invoice.invoice_number}</Td>
                  <Td>{customerNameById.get(invoice.customer_id) ?? "—"}</Td>
                  <Td>{formatDate(invoice.due_date)}</Td>
                  <Td align="right">{formatNaira(invoice.amount_minor)}</Td>
                  <Td>
                    <StatusBadge status={invoice.status} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      {invoice.status === "draft" ? (
                        <>
                          <ConfirmActionButton
                            action={() => act(invoicesApi.send, invoice)}
                            label="Send"
                            tone="primary"
                            confirmTitle="Send this invoice?"
                            confirmMessage={`This posts ${formatNaira(invoice.amount_minor)} as revenue and a receivable against "${customerNameById.get(invoice.customer_id) ?? "this customer"}".`}
                            confirmLabel="Send"
                          />
                          <ConfirmActionButton
                            action={() => act(invoicesApi.void, invoice)}
                            label="Void"
                            tone="danger"
                            confirmTitle="Void this invoice?"
                            confirmMessage="This can't be undone."
                            confirmLabel="Void"
                          />
                        </>
                      ) : null}
                      {invoice.status === "sent" ? (
                        <ConfirmActionButton
                          action={() => act(invoicesApi.pay, invoice)}
                          label="Mark Paid"
                          tone="primary"
                          confirmTitle="Mark this invoice as paid?"
                          confirmMessage={`This clears ${formatNaira(invoice.amount_minor)} from accounts receivable against cash.`}
                          confirmLabel="Mark Paid"
                        />
                      ) : null}
                      {invoice.status === "paid" || invoice.status === "void" ? (
                        <span className="text-ink-soft">—</span>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewInvoiceDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            invoices.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewInvoiceDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const customers = useApiResource(() => customersApi.list());
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [revenueAccountCode, setRevenueAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const revenueAccounts = (accounts.data ?? []).filter(
    (account) => account.type === "revenue" && account.is_active,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await invoicesApi.create({
        customer_id: customerId,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate,
        revenue_account_code: revenueAccountCode,
        amount_minor: nairaToMinor(amount),
        description: description || null,
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Invoice" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="customer">Customer</Label>
          <Select
            id="customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            <option value="">Select customer</option>
            {(customers.data ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            placeholder="e.g. INV-3004"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="revenueAccount">Revenue Account</Label>
          <Select
            id="revenueAccount"
            value={revenueAccountCode}
            onChange={(event) => setRevenueAccountCode(event.target.value)}
            required
          >
            <option value="">Select revenue account</option>
            {revenueAccounts.map((account) => (
              <option key={account.id} value={account.code}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount (₦)</Label>
          <Input
            id="amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
