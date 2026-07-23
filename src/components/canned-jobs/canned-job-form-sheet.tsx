"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";

import { CannedJobBuilderForm } from "@/components/canned-jobs/canned-job-builder";
import {
  cannedJobFormFromDetail,
  cannedJobFormToPayload,
  emptyCannedJobForm,
  useCannedJobFormSummary,
  type CannedJobFormState,
} from "@/components/canned-jobs/canned-job-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";
import { saveCannedJob, fetchShopFeeTemplatesForPicker } from "@/server/actions/canned-jobs";
import type { ShopFeeTemplateRow } from "@/server/actions/canned-jobs";
import { fetchShopLaborItemsForPicker } from "@/server/actions/shop-labor-items";
import type { CannedJobDetail } from "@/lib/canned-job-types";

/**
 * Wide floating builder — AutoLeap-style single surface (name, tags, unified line table).
 */
export function CannedJobFormSheet({
  open,
  onOpenChange,
  job,
  categories: _categories,
  laborRateCents = 15000,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: CannedJobDetail | null;
  categories: string[];
  laborRateCents?: number;
  onSaved?: (id?: string) => void;
}) {
  const isEdit = Boolean(job?.id);
  const [form, setForm] = useState<CannedJobFormState>(() =>
    job ? cannedJobFormFromDetail(job) : emptyCannedJobForm(),
  );
  const [shopLaborItems, setShopLaborItems] = useState<ShopLaborItemRow[]>([]);
  const [shopFeeTemplates, setShopFeeTemplates] = useState<ShopFeeTemplateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const summary = useCannedJobFormSummary(form, laborRateCents);

  useEffect(() => {
    if (!open) return;
    setForm(job ? cannedJobFormFromDetail(job) : emptyCannedJobForm());
    setError(null);
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

  function save() {
    if (!form.name.trim()) {
      setError("Job name is required.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveCannedJob(cannedJobFormToPayload(form, job?.id));
      if (res.ok) {
        onOpenChange(false);
        onSaved?.(res.id);
      } else setError(res.error);
    });
  }

  const totalCents = summary.laborCostCents + summary.partsCostCents + summary.feesCostCents;

  return (
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

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-slate-50/90 px-5 py-3.5 sm:px-7">
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

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Total
              </p>
              <p className="text-lg font-bold tabular-nums text-brand-navy">
                {formatCents(totalCents)}
              </p>
            </div>
            <Button
              size="sm"
              onClick={save}
              disabled={pending}
              className="h-9 min-w-[7.5rem] bg-brand-navy px-5 hover:bg-brand-navy/90"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEdit ? (
                "Save"
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
