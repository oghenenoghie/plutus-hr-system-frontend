"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { contractorsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";

export default function ContractorsPage() {
  const contractors = useApiResource(() => contractorsApi.list());

  return (
    <div>
      <PageHeader title="Contractors" subtitle="Vendor withholding tax and payment records" />

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
              </tr>
            </Thead>
            <tbody>
              {contractors.data.map((contractor) => (
                <tr key={contractor.id}>
                  <Td className="font-bold">{contractor.name}</Td>
                  <Td>{contractor.tin ?? "—"}</Td>
                  <Td>{contractor.bank_name ?? "—"}</Td>
                  <Td>
                    {contractor.account_number
                      ? `${contractor.account_number}${contractor.account_name ? ` · ${contractor.account_name}` : ""}`
                      : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
