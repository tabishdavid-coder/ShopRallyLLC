"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, X } from "lucide-react";

import { CannedJobAddToRoDialog } from "@/components/canned-jobs/canned-job-add-to-ro-dialog";
import { CannedJobBuilderForm } from "@/components/canned-jobs/canned-job-builder";
import {
  cannedJobFormFromDetail,
  cannedJobFormToPayload,
  emptyCannedJobForm,
  useCannedJobFormSummary,
  type CannedJobFormState,
} from "@/components/canned-jobs/canned-job-form";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCents } from "@/lib/format";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";
import {
  addCannedJobToRepairOrder,
  saveCannedJob,
  fetchShopFeeTemplatesForPicker,
} from "@/server/actions/canned-jobs";
import type { ShopFeeTemplateRow } from "@/server/actions/canned-jobs";
import { fetchShopLaborItemsForPicker } from "@/server/actions/shop-labor-items";
import type { CannedJobDetail } from "@/lib/canned-job-types";

type SaveIntent = "template" | "newRo" | "addToRo";

/**
 * Wide floating builder — AutoLeap-style single surface (name, tags, unified line table).
 * Same create/edit UI used by Settings → Canned Jobs (`CannedJobsManager`).
 */
export function CannedJobFormSheet({
  open,
  onOpenChange,
  job,
  categories: _categories,
  laborRateCents = 15000,
  onSaved,
  /** When set (e.g. from estimate picker), Add to RO targets this order without a second picker. */
  defaultRepairOrderId,
  /** Called after a successful add to `defaultRepairOrderId` (before navigate/refresh). */
  onAddedToRepairOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: CannedJobDetail | null;
  categories: string[];
  laborRateCents?: number;
  onSaved?: (id?: string) => void;
  defaultRepairOrderId?: string;
  onAddedToRepairOrder?: (cannedJobId: string) => void;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const isEdit = Boolean(job?.id);
  const [form, setForm] = useState<CannedJobFormState>(() =>
    job ? cannedJobFormFromDetail(job) : emptyCannedJobForm(),
  );
  const [shopLaborItems, setShopLaborItems] = useState<ShopLaborItemRow[]>([]);
  const [shopFeeTemplates, setShopFeeTemplates] = useState<ShopFeeTemplateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [addToRoOpen, setAddToRoOpen] = useState(false);
  const [savedCannedJobId, setSavedCannedJobId] = useState<string | null>(null);
  const summary = useCannedJobFormSummary(form, laborRateCents);

  useEffect(() => {
    if (!open) return;
    setForm(job ? cannedJobFormFromDetail(job) : emptyCannedJobForm());
    setError(null);
    setAddToRoOpen(false);
    setSavedCannedJobId(null);
    void reloadShopLaborItems();
    void reloadShopFeeTemplates();
  }, [open, job]);

  function reloadShopFeeTemplates() {
    return fetchShopFeeTemplatesForPicker()
      .then((res) => {
        setShopFeeTemplates(res.ok ? (res.templates ?? []) : []);
      })
      .catch(() => {
        setShopFeeTemplates([]);
      });
  }

  function reloadShopLaborItems() {
    return fetchShopLaborItemsForPicker()
      .then((res) => {
        setShopLaborItems(res.ok ? (res.items ?? []) : []);
      })
      .catch(() => {
        setShopLaborItems([]);
      });
  }

  useEffect(() => {
    if (form.name.trim() && error === "Job name is required.") {
      setError(null);
    }
  }, [form.name, error]);

  function validateForm(): boolean {
    if (!form.name.trim()) {
      setError("Job name is required.");
      return false;
    }
    setError(null);
    return true;
  }

  async function persistCannedJob(): Promise<string | null> {
    const res = await saveCannedJob(cannedJobFormToPayload(form, job?.id));
    if (!res.ok) {
      setError(res.error);
      toast("error", res.error);
      return null;
    }
    return res.id ?? job?.id ?? null;
  }

  async function addToRepairOrder(repairOrderId: string, cannedJobId: string) {
    const res = await addCannedJobToRepairOrder(repairOrderId, cannedJobId);
    if (!res.ok) {
      setError(res.error);
      toast("error", res.error);
      return false;
    }

    setAddToRoOpen(false);
    onOpenChange(false);
    toast("success", `"${form.name.trim()}" added to estimate.`);
    onAddedToRepairOrder?.(cannedJobId);

    // Stay on current estimate when caller already provided the RO; otherwise navigate.
    if (defaultRepairOrderId && repairOrderId === defaultRepairOrderId) {
      router.refresh();
    } else {
      router.push(`/repair-orders/${repairOrderId}/estimate`);
      router.refresh();
    }
    return true;
  }

  function runSave(intent: SaveIntent) {
    if (!validateForm()) return;

    start(async () => {
      const id = await persistCannedJob();
      if (!id) return;

      if (intent === "template") {
        onOpenChange(false);
        toast("success", isEdit ? "Canned job saved." : "Canned job created.");
        onSaved?.(id);
        return;
      }

      if (intent === "newRo") {
        onOpenChange(false);
        toast("success", "Canned job saved — create a repair order to apply it.");
        onSaved?.(id);
        router.push(`/repair-orders/new?cannedJobId=${encodeURIComponent(id)}`);
        return;
      }

      if (defaultRepairOrderId) {
        // Caller (estimate picker) refreshes via onAddedToRepairOrder — skip onSaved toast race.
        await addToRepairOrder(defaultRepairOrderId, id);
        return;
      }

      onSaved?.(id);
      setSavedCannedJobId(id);
      setAddToRoOpen(true);
    });
  }

  function handleAddToRo(repairOrderId: string) {
    const cannedJobId = savedCannedJobId ?? job?.id;
    if (!cannedJobId) return;

    start(async () => {
      await addToRepairOrder(repairOrderId, cannedJobId);
    });
  }

  const totalCents =
    summary.laborCostCents +
    summary.partsCostCents +
    summary.feesCostCents -
    summary.discountsCostCents;

  const addToRoLabel = defaultRepairOrderId ? "Save & add" : "Add to RO";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="flex max-h-[min(92vh,880px)] w-[min(72rem,calc(100vw-1.25rem))] max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden rounded-xl border border-border p-0 shadow-2xl sm:max-w-[72rem]"
        >
          <DialogTitle className="sr-only">
            {isEdit ? `Edit canned job ${job?.name ?? ""}` : "New canned job"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Build a reusable canned job template with labor, parts, and fee lines.
          </DialogDescription>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="absolute right-2 top-2 z-10 size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-5 sm:px-7 sm:pt-6">
            {open ? (
              <CannedJobBuilderForm
                key={job?.id ?? "new"}
                form={form}
                setForm={setForm}
                laborRateCents={laborRateCents}
                shopLaborItems={shopLaborItems}
                shopFeeTemplates={shopFeeTemplates}
                onLaborItemsChanged={reloadShopLaborItems}
                idPrefix={isEdit ? "cj-edit" : "cj-new"}
              />
            ) : null}

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-md border border-brand-red/25 bg-brand-red/5 px-3 py-2 text-xs font-medium text-brand-red"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50/90 px-5 py-3.5 sm:px-7">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="h-9 min-w-[5.5rem] border-border bg-white"
            >
              Cancel
            </Button>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <div className="mr-1 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Total
                </p>
                <p className="text-lg font-bold tabular-nums text-brand-navy">
                  {formatCents(totalCents)}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runSave("addToRo")}
                disabled={pending}
                className="h-9 border-brand-navy/25 bg-white text-brand-navy hover:bg-brand-light/20"
              >
                {addToRoLabel}
              </Button>

              {!defaultRepairOrderId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => runSave("newRo")}
                  disabled={pending}
                  className="h-9 border-brand-navy/25 bg-white text-brand-navy hover:bg-brand-light/20"
                >
                  Save &amp; new RO
                </Button>
              ) : null}

              <div className="flex items-stretch">
                <Button
                  size="sm"
                  onClick={() => runSave("template")}
                  disabled={pending}
                  className="h-9 min-w-[5.5rem] rounded-r-none bg-brand-navy px-5 hover:bg-brand-navy/90"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      className="h-9 rounded-l-none border-l border-white/20 bg-brand-navy px-2 hover:bg-brand-navy/90"
                      aria-label="More save actions"
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => runSave("template")}>
                      Save template only
                    </DropdownMenuItem>
                    {!defaultRepairOrderId ? (
                      <DropdownMenuItem onClick={() => runSave("newRo")}>
                        Save &amp; new RO
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => runSave("addToRo")}>
                      {defaultRepairOrderId ? "Save & add to estimate" : "Save & add to RO"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CannedJobAddToRoDialog
        open={addToRoOpen}
        onOpenChange={setAddToRoOpen}
        cannedJobName={form.name.trim()}
        onSelect={handleAddToRo}
        pending={pending}
      />
    </>
  );
}
