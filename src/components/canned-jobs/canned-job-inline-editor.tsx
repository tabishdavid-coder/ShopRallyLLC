"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save, X } from "lucide-react";

import {
  CannedJobIntakeForm,
  cannedJobFormFromDetail,
  cannedJobFormToPayload,
  emptyCannedJobForm,
  useCannedJobFormSummary,
  type CannedJobFormState,
} from "@/components/canned-jobs/canned-job-form";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { saveCannedJob } from "@/server/actions/canned-jobs";
import type { CannedJobDetail } from "@/lib/canned-job-types";
import { cn } from "@/lib/utils";

export function CannedJobInlineEditor({
  job,
  categories,
  laborRateCents = 15000,
  onSaved,
  onCancel,
  className,
}: {
  job?: CannedJobDetail | null;
  categories: string[];
  laborRateCents?: number;
  onSaved?: (id?: string) => void;
  onCancel?: () => void;
  className?: string;
}) {
  const isEdit = Boolean(job?.id);
  const [form, setForm] = useState<CannedJobFormState>(() =>
    job ? cannedJobFormFromDetail(job) : emptyCannedJobForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const summary = useCannedJobFormSummary(form, laborRateCents);

  useEffect(() => {
    setForm(job ? cannedJobFormFromDetail(job) : emptyCannedJobForm());
    setError(null);
  }, [job]);

  function save() {
    if (!form.name.trim()) {
      setError("Job name is required.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveCannedJob(cannedJobFormToPayload(form, job?.id));
      if (res.ok) onSaved?.(res.id);
      else setError(res.error);
    });
  }

  const totalCents = summary.laborCostCents + summary.partsCostCents;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 border-b border-border bg-gradient-to-r from-brand-navy/[0.04] via-white to-brand-light/10 px-4 py-3 lg:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy/70">
              {isEdit ? "Edit template" : "New template"}
            </p>
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {isEdit ? job?.name : "Create canned job"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Labor and parts apply to estimates using your shop rate and markup matrices.
            </p>
          </div>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onCancel}
              disabled={pending}
              className="shrink-0 text-muted-foreground"
              aria-label="Close editor"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md border border-border bg-white px-2 py-1 text-[11px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{summary.laborLineCount}</span> labor ·{" "}
            {summary.laborHours.toFixed(1)}h
          </span>
          <span className="rounded-md border border-border bg-white px-2 py-1 text-[11px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{summary.partLineCount}</span> parts ·{" "}
            {formatCents(summary.partsCostCents)}
          </span>
          <span className="rounded-md border border-brand-navy/20 bg-brand-navy/5 px-2 py-1 text-[11px] font-semibold tabular-nums text-brand-navy">
            Total {formatCents(totalCents)}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-5">
        <CannedJobIntakeForm
          form={form}
          setForm={setForm}
          categories={categories}
          laborRateCents={laborRateCents}
          showQuickTemplates={!isEdit}
          step="all"
          dense
          hideInlineSummary
        />

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-brand-red/25 bg-brand-red/5 px-3 py-2 text-xs font-medium text-brand-red"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:px-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={pending || !onCancel}
          className="h-9 text-muted-foreground"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending}
          className="h-9 min-w-36 gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {isEdit ? "Save changes" : "Save canned job"}
        </Button>
      </div>
    </div>
  );
}
