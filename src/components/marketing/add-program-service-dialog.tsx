"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Star, Wrench } from "lucide-react";

import { CannedJobFormSheet } from "@/components/canned-jobs/canned-job-form-sheet";
import { EstimateActionToastProvider } from "@/components/repair-order/estimate-action-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import { formatCannedJobCostHint } from "@/lib/maintenance-canned-jobs";
import {
  PROGRAM_SERVICE_TYPES,
  PROGRAM_SERVICE_TYPE_LABELS,
  type ProgramServiceInput,
  type ProgramServiceType,
} from "@/lib/maintenance-programs";
import {
  createProgramService,
  createProgramServiceFromCannedJob,
  refreshProgramServiceCostFromJob,
  updateProgramService,
} from "@/server/actions/maintenance-program-services";
import { cn } from "@/lib/utils";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  serviceType: string;
  defaultQuantity: number | null;
  defaultIntervalDays: number | null;
  defaultDiscountBps: number | null;
  unitCostCents: number | null;
  active: boolean;
  cannedJobId: string | null;
  cannedJob?: { id: string; name: string } | null;
};

type AddMode = "canned" | "custom" | "new-job";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ServiceRow | null;
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  laborRateCents: number;
  linkedCannedJobIds: Set<string>;
  onComplete: () => void;
};

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

const EMPTY: ProgramServiceInput = {
  name: "",
  serviceType: "VISITS",
  defaultQuantity: 1,
  defaultIntervalDays: 90,
  active: true,
};

function dollarsFromCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function centsFromDollars(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
};

function SubscriptionFields({
  serviceType,
  defaultQuantity,
  defaultIntervalDays,
  defaultDiscountBps,
  onChange,
}: {
  serviceType: ProgramServiceType;
  defaultQuantity?: number;
  defaultIntervalDays?: number;
  defaultDiscountBps?: number;
  onChange: (patch: Partial<ProgramServiceInput>) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>How is this included in a plan?</Label>
        <Select
          value={serviceType}
          onValueChange={(v) => onChange({ serviceType: v as ProgramServiceType })}
        >
          <SelectTrigger className={inputCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROGRAM_SERVICE_TYPES.map((k) => (
              <SelectItem key={k} value={k}>
                {PROGRAM_SERVICE_TYPE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {serviceType === "VISITS" ? (
        <div className="space-y-1.5">
          <Label>Default visits included</Label>
          <Input
            type="number"
            min={1}
            value={defaultQuantity ?? 1}
            onChange={(e) =>
              onChange({ defaultQuantity: parseInt(e.target.value, 10) || 1 })
            }
            className={inputCls}
          />
        </div>
      ) : null}
      {serviceType === "SCHEDULED" || serviceType === "UNLIMITED" ? (
        <div className="space-y-1.5">
          <Label>Minimum days between uses</Label>
          <Input
            type="number"
            min={1}
            value={defaultIntervalDays ?? 90}
            onChange={(e) =>
              onChange({ defaultIntervalDays: parseInt(e.target.value, 10) || 90 })
            }
            className={inputCls}
          />
        </div>
      ) : null}
      {serviceType === "DISCOUNT" ? (
        <div className="space-y-1.5">
          <Label>Default discount (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={defaultDiscountBps != null ? defaultDiscountBps / 100 : ""}
            onChange={(e) =>
              onChange({
                defaultDiscountBps: Math.round(parseFloat(e.target.value || "0") * 100),
              })
            }
            className={inputCls}
          />
        </div>
      ) : null}
    </>
  );
}

export function AddProgramServiceDialog({
  open,
  onOpenChange,
  editing,
  cannedJobs,
  cannedJobCategories,
  laborRateCents,
  linkedCannedJobIds,
  onComplete,
}: Props) {
  const isEdit = Boolean(editing);
  const [mode, setMode] = useState<AddMode>("canned");
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramServiceInput>(EMPTY);
  const [cannedForm, setCannedForm] = useState<ProgramServiceInput>({
    ...EMPTY,
    serviceType: "VISITS",
    defaultQuantity: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const availableJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cannedJobs.filter((j) => {
      if (linkedCannedJobIds.has(j.id) && j.id !== editing?.cannedJobId) return false;
      if (!q) return true;
      return (
        j.name.toLowerCase().includes(q) ||
        j.category?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q)
      );
    });
  }, [cannedJobs, search, linkedCannedJobIds, editing?.cannedJobId]);

  const selectedJob = selectedJobId
    ? cannedJobs.find((j) => j.id === selectedJobId)
    : null;

  function resetForOpen() {
    if (editing) {
      setMode(editing.cannedJobId ? "canned" : "custom");
      setForm({
        name: editing.name,
        description: editing.description ?? undefined,
        cannedJobId: editing.cannedJobId ?? undefined,
        serviceType: editing.serviceType as ProgramServiceType,
        defaultQuantity: editing.defaultQuantity ?? 1,
        defaultIntervalDays: editing.defaultIntervalDays ?? 90,
        defaultDiscountBps: editing.defaultDiscountBps ?? undefined,
        unitCostCents: editing.unitCostCents ?? undefined,
        active: editing.active,
      });
      setSelectedJobId(editing.cannedJobId);
    } else {
      setMode("canned");
      setForm(EMPTY);
      setCannedForm({ ...EMPTY, defaultQuantity: 1 });
      setSelectedJobId(null);
      setSearch("");
    }
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (next) resetForOpen();
    onOpenChange(next);
  }

  function saveCustom() {
    setError(null);
    start(async () => {
      const res = isEdit
        ? await updateProgramService(editing!.id, form)
        : await createProgramService(form);
      if (res.ok) {
        onComplete();
        onOpenChange(false);
      } else {
        setError(res.error);
      }
    });
  }

  function saveFromCanned() {
    if (!selectedJobId && !editing?.cannedJobId) {
      setError("Select a job template.");
      return;
    }
    setError(null);
    const payload = isEdit ? form : cannedForm;
    start(async () => {
      if (isEdit) {
        const res = await updateProgramService(editing!.id, {
          ...form,
          cannedJobId: editing!.cannedJobId ?? undefined,
        });
        if (res.ok) {
          onComplete();
          onOpenChange(false);
        } else setError(res.error);
        return;
      }
      const res = await createProgramServiceFromCannedJob({
        cannedJobId: selectedJobId!,
        serviceType: payload.serviceType,
        defaultQuantity: payload.defaultQuantity ?? undefined,
        defaultIntervalDays: payload.defaultIntervalDays ?? undefined,
        defaultDiscountBps: payload.defaultDiscountBps ?? undefined,
      });
      if (res.ok) {
        onComplete();
        onOpenChange(false);
      } else setError(res.error);
    });
  }

  function refreshCost() {
    if (!editing?.cannedJobId) return;
    start(async () => {
      await refreshProgramServiceCostFromJob(editing.id);
      onComplete();
    });
  }

  function afterNewJob(cannedJobId?: string) {
    if (!cannedJobId) return;
    setSelectedJobId(cannedJobId);
    setMode("canned");
    start(async () => {
      const res = await createProgramServiceFromCannedJob({
        cannedJobId,
        serviceType: "VISITS",
        defaultQuantity: 1,
      });
      if (res.ok) {
        onComplete();
        onOpenChange(false);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit service" : "Add to service library"}</DialogTitle>
          </DialogHeader>

          {!isEdit ? (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "canned" as const, label: "From job template", icon: Star },
                  { id: "new-job" as const, label: "Create job", icon: Wrench },
                  { id: "custom" as const, label: "Custom perk", icon: null },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    setError(null);
                    if (id === "new-job") setJobDialogOpen(true);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    mode === id
                      ? "border-brand-navy bg-brand-light/20 text-brand-navy"
                      : "hover:bg-muted/50",
                  )}
                >
                  {Icon ? <Icon className="inline size-3.5 mr-1.5 -mt-0.5" /> : null}
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {isEdit && editing?.cannedJobId ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
              <p>
                Linked to job template:{" "}
                <Link href="/canned-jobs" className="font-medium text-brand-navy underline">
                  {editing.cannedJob?.name ?? "View canned jobs"}
                </Link>
              </p>
              <Button type="button" variant="outline" size="sm" onClick={refreshCost}>
                <RefreshCw className="mr-1 size-3.5" />
                Refresh cost from template
              </Button>
            </div>
          ) : null}

          {(mode === "canned" || (isEdit && editing?.cannedJobId)) && (
            <div className="space-y-3">
              {!isEdit ? (
                <>
                  <Input
                    placeholder="Search job templates…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={inputCls}
                  />
                  <ul className="max-h-48 overflow-y-auto rounded-md border divide-y">
                    {availableJobs.length === 0 ? (
                      <li className="p-4 text-sm text-muted-foreground text-center">
                        {cannedJobs.length === 0 ? (
                          <>
                            No job templates yet.{" "}
                            <button
                              type="button"
                              className="text-brand-navy underline"
                              onClick={() => setJobDialogOpen(true)}
                            >
                              Create one
                            </button>
                          </>
                        ) : (
                          "No matching templates (or already in library)."
                        )}
                      </li>
                    ) : (
                      availableJobs.map((job) => (
                        <li key={job.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedJobId(job.id)}
                            className={cn(
                              "w-full px-3 py-2.5 text-left text-sm hover:bg-muted/40",
                              selectedJobId === job.id && "bg-brand-light/15",
                            )}
                          >
                            <p className="font-medium">{job.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {job.laborHours.toFixed(1)} hrs · {job.partLineCount} parts ·{" "}
                              {formatCannedJobCostHint(job, laborRateCents)}
                            </p>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : null}

              <SubscriptionFields
                serviceType={(isEdit ? form : cannedForm).serviceType}
                defaultQuantity={(isEdit ? form : cannedForm).defaultQuantity ?? undefined}
                defaultIntervalDays={(isEdit ? form : cannedForm).defaultIntervalDays ?? undefined}
                defaultDiscountBps={(isEdit ? form : cannedForm).defaultDiscountBps ?? undefined}
                onChange={(patch) =>
                  isEdit ? setForm((f) => ({ ...f, ...patch })) : setCannedForm((f) => ({ ...f, ...patch }))
                }
              />

              {selectedJob && !isEdit ? (
                <p className="text-xs text-muted-foreground">
                  Estimated your cost per visit:{" "}
                  <span className="font-medium text-foreground">
                    {formatCannedJobCostHint(selectedJob, laborRateCents)}
                  </span>
                </p>
              ) : null}
            </div>
          )}

          {mode === "custom" && !editing?.cannedJobId && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                For perks not tied to a job template — discounts, credits, lounge access, etc.
              </p>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="10% labor discount"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className={inputCls}
                />
              </div>
              <SubscriptionFields
                serviceType={form.serviceType}
                defaultQuantity={form.defaultQuantity ?? undefined}
                defaultIntervalDays={form.defaultIntervalDays ?? undefined}
                defaultDiscountBps={form.defaultDiscountBps ?? undefined}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              />
              <div className="space-y-1.5">
                <Label>Your cost per redemption ($) — optional</Label>
                <Input
                  value={dollarsFromCents(form.unitCostCents)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitCostCents: centsFromDollars(e.target.value) }))
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className={mode === "new-job" && !isEdit ? "sm:justify-start" : undefined}>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {mode === "new-job" && !isEdit ? (
              <span className="text-xs text-muted-foreground sm:ml-auto">
                Finish the job editor — it will be added to your library automatically.
              </span>
            ) : mode === "custom" && !editing?.cannedJobId ? (
              <Button onClick={saveCustom} disabled={pending}>
                {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                Save service
              </Button>
            ) : mode === "canned" || editing?.cannedJobId ? (
              <Button onClick={saveFromCanned} disabled={pending || (!isEdit && !selectedJobId)}>
                {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                {isEdit ? "Save" : "Add to library"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EstimateActionToastProvider>
        <CannedJobFormSheet
          open={jobDialogOpen}
          onOpenChange={setJobDialogOpen}
          categories={cannedJobCategories}
          onSaved={(id) => {
            setJobDialogOpen(false);
            if (id) afterNewJob(id);
          }}
        />
      </EstimateActionToastProvider>
    </>
  );
}
