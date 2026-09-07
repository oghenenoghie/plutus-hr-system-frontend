"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { companyAssetsApi } from "@/lib/api/endpoints";
import { titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { CompanyAssetCategory } from "@/lib/types";

const CATEGORIES: CompanyAssetCategory[] = ["laptop", "phone", "vehicle", "furniture", "other"];

export default function AssetsPage() {
  const router = useRouter();
  const assets = useApiResource(() => companyAssetsApi.list());
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Company Assets"
        subtitle="Equipment and property issued to employees"
        action={<Button onClick={() => setCreating(true)}>New Asset</Button>}
      />

      <Card>
        {assets.loading ? <LoadingState /> : null}
        {assets.error ? <ErrorState message={assets.error} /> : null}
        {assets.data && assets.data.length === 0 ? (
          <EmptyState label="No company assets on record yet." />
        ) : null}
        {assets.data && assets.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Asset Tag</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {assets.data.map((asset) => (
                <tr key={asset.id}>
                  <Td className="font-bold">{asset.name}</Td>
                  <Td>{asset.asset_tag}</Td>
                  <Td>{titleCase(asset.category)}</Td>
                  <Td>
                    <StatusBadge status={asset.status} />
                  </Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => router.push(`/assets/${asset.id}`)}>
                      View
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewAssetDrawer
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/assets/${id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function NewAssetDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [category, setCategory] = useState<CompanyAssetCategory>("laptop");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const asset = await companyAssetsApi.create({
        name,
        asset_tag: assetTag,
        category,
        purchase_value_minor: purchaseValue ? Math.round(Number(purchaseValue) * 100) : null,
      });
      showToast("Asset created", "good");
      onCreated(asset.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Asset" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. MacBook Pro 14"
            required
          />
        </div>
        <div>
          <Label htmlFor="asset-tag">Asset Tag</Label>
          <Input
            id="asset-tag"
            value={assetTag}
            onChange={(event) => setAssetTag(event.target.value)}
            placeholder="e.g. AST-001"
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as CompanyAssetCategory)}
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="purchase-value">Purchase Value (₦)</Label>
          <Input
            id="purchase-value"
            type="number"
            min={0}
            step="0.01"
            value={purchaseValue}
            onChange={(event) => setPurchaseValue(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Asset"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
