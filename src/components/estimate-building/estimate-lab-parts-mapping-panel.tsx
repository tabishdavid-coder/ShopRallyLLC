"use client";

import { ChevronLeft, Loader2, Plus } from "lucide-react";

import { EstimateLabServiceSelect } from "@/components/estimate-building/estimate-lab-service-select";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import type { HubPart } from "@/lib/hub-parts";
import type { ServiceJobSummary } from "@/lib/service-job-parts";
import type { PartResult } from "@/server/services/partstech";

export type PartsMappingRow = {
  part: PartResult;
  quantity: number;
  method: "add" | "replace";
  jobId: string;
  replacePartId: string;
};

export function buildPartsMappingRows(
  parts: PartResult[],
  quantities: Record<string, number>,
  defaultJobId: string,
): PartsMappingRow[] {
  return parts.map((part) => ({
    part,
    quantity: quantities[part.partstechId] ?? 1,
    method: "add" as const,
    jobId: defaultJobId,
    replacePartId: "",
  }));
}

export function EstimateLabPartsMappingPanel({
  rows,
  onRowsChange,
  jobs,
  existingParts,
  saving,
  error,
  onBack,
  onSave,
}: {
  rows: PartsMappingRow[];
  onRowsChange: (rows: PartsMappingRow[]) => void;
  jobs: ServiceJobSummary[];
  existingParts: HubPart[];
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onSave: () => void;
}) {
  function patchRow(index: number, patch: Partial<PartsMappingRow>) {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const invalid = rows.some((r) => r.method === "replace" && !r.replacePartId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-start gap-2 border-b border-border pb-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1 shrink-0">
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div>
          <p className="text-sm font-semibold text-brand-navy">Assign quoted parts to services</p>
          <p className="text-xs text-muted-foreground">
            Each line lands on the Services tab under the service you pick. Replace swaps an existing part line.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium">Quoted part</th>
              <th className="px-2 py-2 text-left font-medium">Action</th>
              <th className="min-w-[10rem] px-2 py-2 text-left font-medium">Service / target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.part.partstechId}-${i}`} className="border-b align-top last:border-0">
                <td className="px-3 py-2">
                  <span className="font-medium text-foreground">
                    {row.part.brand ? `${row.part.brand} · ` : ""}
                    {row.part.description}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {row.part.partNumber}
                    {row.part.supplier ? ` · ${row.part.supplier}` : ""}
                    {row.quantity > 1 ? ` · qty ${row.quantity}` : ""}
                    {" · "}
                    {formatCents(row.part.costCents)} cost
                  </span>
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={row.method === "add"}
                        onChange={() => patchRow(i, { method: "add" })}
                      />
                      Add to service
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={row.method === "replace"}
                        onChange={() => patchRow(i, { method: "replace" })}
                        disabled={existingParts.length === 0}
                      />
                      Replace line
                    </label>
                  </div>
                </td>
                <td className="px-2 py-2">
                  {row.method === "add" ? (
                    <EstimateLabServiceSelect
                      value={row.jobId || jobs[0]?.id || ""}
                      jobs={jobs}
                      onValueChange={(jobId) => patchRow(i, { jobId })}
                    />
                  ) : (
                    <select
                      value={row.replacePartId}
                      onChange={(e) => patchRow(i, { replacePartId: e.target.value })}
                      className="h-8 w-full max-w-[13rem] rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Select part to replace…</option>
                      {existingParts.map((ep) => (
                        <option key={ep.id} value={ep.id}>
                          {ep.description} ({ep.jobName})
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex shrink-0 gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="button"
          className="ml-auto gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
          disabled={saving || invalid || rows.length === 0}
          onClick={onSave}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Save {rows.length} quoted part{rows.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
