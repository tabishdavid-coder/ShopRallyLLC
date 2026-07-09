"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import { AddProgramServiceDialog } from "@/components/marketing/add-program-service-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PROGRAM_SERVICE_TYPE_LABELS,
  type ProgramServiceType,
} from "@/lib/maintenance-programs";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import {
  archiveProgramService,
  updateProgramServiceCost,
} from "@/server/actions/maintenance-program-services";
import type { MaintenanceProgramService } from "@/generated/prisma";

type ServiceRow = MaintenanceProgramService & {
  cannedJob?: { id: string; name: string } | null;
  _count?: { entitlements: number };
};

type Props = {
  canEdit: boolean;
  services: ServiceRow[];
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  laborRateCents: number;
};

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring h-8";

function dollarsFromCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function centsFromDollars(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function MaintenanceServiceLibrary({
  canEdit,
  services,
  cannedJobs,
  cannedJobCategories,
  laborRateCents,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [costEdits, setCostEdits] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  const linkedCannedJobIds = useMemo(
    () => new Set(services.filter((s) => s.cannedJobId).map((s) => s.cannedJobId!)),
    [services],
  );

  const activeServices = services.filter((s) => s.active);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: ServiceRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  function saveCost(id: string) {
    if (!canEdit) return;
    const cents = centsFromDollars(costEdits[id] ?? "");
    start(async () => {
      await updateProgramServiceCost(id, cents);
      setCostEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });
  }

  function remove(id: string) {
    if (!confirm("Archive this service? Plans that already use it keep their copy.")) return;
    start(async () => {
      await archiveProgramService(id);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white p-5 md:p-6 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Service library</h2>
          <p className="text-sm text-slate-600 max-w-xl">
            Pull from your{" "}
            <Link href="/canned-jobs" className="text-brand-navy underline">
              canned jobs
            </Link>
            , create a new job template, or add a custom perk. Then bundle services into
            subscription plans.
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 size-4" />
            Add service
          </Button>
        ) : null}
      </div>

      {activeServices.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-2">
          <p>No services yet.</p>
          <p>
            Start from an existing job template (oil change, brake service…) or create a custom
            perk.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-800">
              <tr>
                <th className="px-4 py-2.5 font-medium">Service</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Source</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">In plans</th>
                <th className="px-4 py-2.5 font-medium">Your cost</th>
                <th className="px-4 py-2.5 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {activeServices.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PROGRAM_SERVICE_TYPE_LABELS[row.serviceType as ProgramServiceType]}
                      {row.serviceType === "VISITS" && row.defaultQuantity != null
                        ? ` · ${row.defaultQuantity}×`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {row.cannedJob ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 text-brand-navy" />
                        Job template
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Custom</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {row._count?.entitlements ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex items-center gap-1 max-w-[140px]">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          className={inputCls}
                          placeholder="—"
                          value={
                            costEdits[row.id] ??
                            (row.unitCostCents != null ? dollarsFromCents(row.unitCostCents) : "")
                          }
                          onChange={(e) =>
                            setCostEdits((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                          onBlur={() => {
                            if (costEdits[row.id] !== undefined) saveCost(row.id);
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {row.unitCostCents != null ? `$${dollarsFromCents(row.unitCostCents)}` : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          onClick={() => remove(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddProgramServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        cannedJobs={cannedJobs}
        cannedJobCategories={cannedJobCategories}
        laborRateCents={laborRateCents}
        linkedCannedJobIds={linkedCannedJobIds}
        onComplete={() => router.refresh()}
      />
    </section>
  );
}
