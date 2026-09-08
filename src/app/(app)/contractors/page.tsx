"use client";

import { Fragment, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { contractorsApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Contractor, WhtCategory, WhtPayment } from "@/lib/types";

export default function ContractorsPage() {
  const contractors = useApiResource(() => contractorsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, WhtPayment[]>>({});
  const [loadingPaymentsId, setLoadingPaymentsId] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<Contractor | null>(null);

  async function loadPayments(contractorId: string) {
    setLoadingPaymentsId(contractorId);
    try {
      const result = await contractorsApi.payments(contractorId);
      setPayments((prev) => ({ ...prev, [contractorId]: result }));
    } catch (err) {
      showToast(
        err instanceof ApiError ? String(err.detail ?? err.message) : "Failed to load payments.",
        "bad",
      );
    } finally {
      setLoadingPaymentsId(null);
    }
  }

  function toggleExpand(contractor: Contractor) {
    if (expandedId === contractor.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(contractor.id);
    if (!payments[contractor.id]) {
      loadPayments(contractor.id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Contractors"
        subtitle="Vendor withholding tax and payment records"
        action={<Button onClick={() => setCreating(true)}>New Contractor</Button>}
      />

      <Card>
        {contractors.loading ? <LoadingState /> : null}
        {contractors.error ? <ErrorState message={contractors.error} /> : null}
        {contractors.data && contractors.data.length === 0 ? (
          <EmptyState label="No contractors on record yet." />
        ) : null}
        {contractors.data && contractors.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>TIN</Th>
                <Th>Bank</Th>
                <Th>Account</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {contractors.data.map((contractor) => (
                <Fragment key={contractor.id}>
                  <tr>
                    <Td className="font-bold">{contractor.name}</Td>
                    <Td>{contractor.tin ?? "—"}</Td>
                    <Td>{contractor.bank_name ?? "—"}</Td>
                    <Td>
                      {contractor.account_number
                        ? `${contractor.account_number}${contractor.account_name ? ` · ${contractor.account_name}` : ""}`
                        : "—"}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="md" variant="secondary" onClick={() => toggleExpand(contractor)}>
                          {expandedId === contractor.id ? "Hide" : "Payments"}
                        </Button>
                        <Button size="md" onClick={() => setRecordingFor(contractor)}>
                          Record Payment
                        </Button>
                      </div>
                    </Td>
                  </tr>
                  {expandedId === contractor.id ? (
                    <tr>
                      <td colSpan={5} className="border-b border-border bg-bg px-4 py-5">
                        {loadingPaymentsId === contractor.id ? <LoadingState /> : null}
                        {payments[contractor.id] && payments[contractor.id]!.length === 0 ? (
                          <p className="text-[13px] text-ink-soft">No WHT payments recorded yet.</p>
                        ) : null}
                        {payments[contractor.id] && payments[contractor.id]!.length > 0 ? (
                          <Table>
                            <Thead>
                              <tr>
                                <Th>Category</Th>
                                <Th align="right">Gross</Th>
                                <Th align="right">WHT</Th>
                                <Th align="right">Net</Th>
                                <Th>Payment Date</Th>
                                <Th>Certificate</Th>
                              </tr>
                            </Thead>
                            <tbody>
                              {payments[contractor.id]!.map((payment) => (
                                <tr key={payment.id}>
                                  <Td>{titleCase(payment.category)}</Td>
                                  <Td align="right">{formatNaira(payment.gross_amount_minor)}</Td>
                                  <Td align="right">{formatNaira(payment.wht_amount_minor)}</Td>
                                  <Td align="right">{formatNaira(payment.net_amount_minor)}</Td>
                                  <Td>{formatDate(payment.payment_date)}</Td>
                                  <Td>{payment.certificate_number}</Td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewContractorDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            contractors.reload();
          }}
        />
      ) : null}

      {recordingFor ? (
        <RecordPaymentDrawer
          contractor={recordingFor}
          onClose={() => setRecordingFor(null)}
          onRecorded={() => {
            const contractorId = recordingFor.id;
            setRecordingFor(null);
            setExpandedId(contractorId);
            loadPayments(contractorId);
          }}
        />
      ) : null}
    </div>
  );
}

function NewContractorDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [tin, setTin] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await contractorsApi.create({
        name,
        tin: tin || null,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        account_name: accountName || null,
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Contractor" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="tin">TIN (optional)</Label>
          <Input id="tin" value={tin} onChange={(event) => setTin(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="bank-name">Bank Name (optional)</Label>
          <Input id="bank-name" value={bankName} onChange={(event) => setBankName(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="account-number">Account Number (optional)</Label>
          <Input
            id="account-number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="account-name">Account Name (optional)</Label>
          <Input
            id="account-name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function RecordPaymentDrawer({
  contractor,
  onClose,
  onRecorded,
}: {
  contractor: Contractor;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<WhtCategory>("services");
  const [grossAmount, setGrossAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await contractorsApi.recordPayment(contractor.id, {
        category,
        gross_amount_minor: nairaToMinor(grossAmount),
        payment_date: paymentDate,
      });
      showToast("Payment recorded", "good");
      onRecorded();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Record Payment — ${contractor.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="category">Service Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as WhtCategory)}
          >
            <option value="services">Services (10%)</option>
            <option value="goods">Goods (5%)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="gross-amount">Gross Amount (₦)</Label>
          <Input
            id="gross-amount"
            inputMode="decimal"
            value={grossAmount}
            onChange={(event) => setGrossAmount(event.target.value)}
            placeholder="e.g. 1200000"
            required
          />
        </div>
        <div>
          <Label htmlFor="payment-date">Payment Date</Label>
          <Input
            id="payment-date"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || nairaToMinor(grossAmount) <= 0}>
            {submitting ? "Recording…" : "Record Payment"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
