"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { fixedAssetsApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { FixedAsset } from "@/lib/types";

export default function FixedAssetsPage() {
  const assets = useApiResource(() => fixedAssetsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [disposing, setDisposing] = useState<FixedAsset | null>(null);

  async function depreciate(asset: FixedAsset) {
    try {
      await fixedAssetsApi.depreciate(asset.id);
      assets.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Fixed Assets"
        subtitle="Depreciable company property — cost, accumulated depreciation, and book value"
        action={<Button onClick={() => setCreating(true)}>New Fixed Asset</Button>}
      />

      <Card>
        {assets.loading ? <LoadingState /> : null}
        {assets.error ? <ErrorState message={assets.error} /> : null}
        {assets.data && assets.data.length === 0 ? (
          <EmptyState label="No fixed assets yet." />
        ) : null}
        {assets.data && assets.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Tag</Th>
                <Th>Name</Th>
                <Th>Acquired</Th>
                <Th align="right">Cost</Th>
                <Th align="right">Accum. Depreciation</Th>
                <Th align="right">Book Value</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {assets.data.map((asset) => (
                <tr key={asset.id}>
                  <Td className="font-mono text-[12px]">{asset.asset_tag}</Td>
                  <Td className="font-bold">{asset.name}</Td>
                  <Td>{formatDate(asset.acquisition_date)}</Td>
                  <Td align="right">{formatNaira(asset.cost_minor)}</Td>
                  <Td align="right">{formatNaira(asset.accumulated_depreciation_minor)}</Td>
                  <Td align="right" className="font-bold">
                    {formatNaira(asset.book_value_minor)}
                  </Td>
                  <Td>
                    <StatusBadge status={asset.status} />
                  </Td>
                  <Td align="right">
                    {asset.status === "active" ? (
                      <div className="flex justify-end gap-2">
                        <ConfirmActionButton
                          action={() => depreciate(asset)}
                          label="Depreciate"
                          tone="primary"
                          confirmTitle="Record depreciation for this period?"
                          confirmMessage={`Posts one period of straight-line depreciation for "${asset.name}" against accumulated depreciation.`}
                          confirmLabel="Record"
                        />
                        <Button variant="secondary" onClick={() => setDisposing(asset)}>
                          Dispose
                        </Button>
                      </div>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewFixedAssetDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            assets.reload();
          }}
        />
      ) : null}

      {disposing ? (
        <DisposeFixedAssetDrawer
          asset={disposing}
          onClose={() => setDisposing(null)}
          onDisposed={() => {
            setDisposing(null);
            assets.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewFixedAssetDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [cost, setCost] = useState("");
  const [salvageValue, setSalvageValue] = useState("");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetsApi.create({
        name,
        asset_tag: assetTag,
        acquisition_date: acquisitionDate,
        cost_minor: nairaToMinor(cost),
        salvage_value_minor: salvageValue ? nairaToMinor(salvageValue) : 0,
        useful_life_months: Number(usefulLifeMonths),
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Fixed Asset" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="assetTag">Asset Tag</Label>
          <Input
            id="assetTag"
            value={assetTag}
            onChange={(event) => setAssetTag(event.target.value)}
            placeholder="e.g. FA-1003"
            required
          />
        </div>
        <div>
          <Label htmlFor="acquisitionDate">Acquisition Date</Label>
          <Input
            id="acquisitionDate"
            type="date"
            value={acquisitionDate}
            onChange={(event) => setAcquisitionDate(event.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cost">Cost (₦)</Label>
            <Input id="cost" value={cost} onChange={(event) => setCost(event.target.value)} inputMode="decimal" required />
          </div>
          <div>
            <Label htmlFor="salvageValue">Salvage Value (₦)</Label>
            <Input
              id="salvageValue"
              value={salvageValue}
              onChange={(event) => setSalvageValue(event.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="usefulLifeMonths">Useful Life (months)</Label>
          <Input
            id="usefulLifeMonths"
            value={usefulLifeMonths}
            onChange={(event) => setUsefulLifeMonths(event.target.value)}
            inputMode="numeric"
            required
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

function DisposeFixedAssetDrawer({
  asset,
  onClose,
  onDisposed,
}: {
  asset: FixedAsset;
  onClose: () => void;
  onDisposed: () => void;
}) {
  const { showToast } = useToast();
  const [proceeds, setProceeds] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetsApi.dispose(asset.id, {
        proceeds_minor: proceeds ? nairaToMinor(proceeds) : 0,
      });
      onDisposed();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Dispose ${asset.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Current book value: <span className="font-bold text-ink">{formatNaira(asset.book_value_minor)}</span>.
          Any difference between proceeds and book value posts as a gain or loss.
        </p>
        <div>
          <Label htmlFor="proceeds">Disposal Proceeds (₦)</Label>
          <Input
            id="proceeds"
            value={proceeds}
            onChange={(event) => setProceeds(event.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Disposing…" : "Dispose Asset"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
