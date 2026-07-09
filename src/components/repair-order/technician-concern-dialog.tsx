"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CrmDialogFooterButtons, CrmDialogShell } from "@/components/crm/crm-dialog-shell";
import { CrmFormField } from "@/components/crm/crm-form-field";
import { CrmFormSection } from "@/components/crm/crm-form-section";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConcernMediaUpload } from "@/components/repair-order/concern-media-upload";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { addConcern, updateConcern } from "@/server/actions/concerns";
import type { ConcernRow } from "@/components/repair-order/concern-types";
import { INSPECTION_ITEM_STATUS, INSPECTION_ITEM_STATUS_LABELS } from "@/lib/inspection";
import type { InspectionItemStatus } from "@/generated/prisma";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const inputClass = "border-brand-light/40";

const RATING_OPTIONS: InspectionItemStatus[] = [
  INSPECTION_ITEM_STATUS.GREEN,
  INSPECTION_ITEM_STATUS.YELLOW,
  INSPECTION_ITEM_STATUS.RED,
];

const RATING_BADGE: Record<InspectionItemStatus, string> = {
  GREEN: "bg-emerald-500 text-white",
  YELLOW: "bg-amber-500 text-white",
  RED: "bg-rose-500 text-white",
  NA: "bg-slate-400 text-white",
};

const RATING_SHORT: Record<InspectionItemStatus, string> = {
  GREEN: "G",
  YELLOW: "Y",
  RED: "R",
  NA: "—",
};

function CharCounter({ value, max = MAX_CHARS }: { value: string; max?: number }) {
  const remaining = max - value.length;
  return (
    <p className="text-right text-xs text-muted-foreground">
      {remaining} character{remaining === 1 ? "" : "s"} remaining
    </p>
  );
}

function RatingOption({ status }: { status: InspectionItemStatus }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-xs font-bold",
          RATING_BADGE[status],
        )}
      >
        {RATING_SHORT[status]}
      </span>
      <span>{INSPECTION_ITEM_STATUS_LABELS[status]}</span>
    </span>
  );
}

export function TechnicianConcernDialog({
  open,
  onOpenChange,
  roId,
  concern,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  concern?: ConcernRow | null;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState<InspectionItemStatus | "">("");
  const [text, setText] = useState("");
  const [finding, setFinding] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(concern);

  useEffect(() => {
    if (!open) return;
    const initialRating = concern?.inspectionRating;
    setRating(
      initialRating && initialRating !== "NA" ? initialRating : INSPECTION_ITEM_STATUS.YELLOW,
    );
    setText(concern?.text ?? "");
    setFinding(concern?.finding ?? "");
    setFiles([]);
    setError(null);
  }, [open, concern]);

  function handleOpenChange(next: boolean) {
    if (!next && !pending) onOpenChange(next);
  }

  function submit() {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Inspection task is required.");
      return;
    }
    if (!rating || rating === "NA") {
      setError("Inspection rating is required.");
      return;
    }

    startTransition(async () => {
      const payload = {
        text: trimmed,
        finding: finding.trim() || null,
        inspectionRating: rating as "GREEN" | "YELLOW" | "RED",
      };
      const res = isEdit && concern
        ? await updateConcern(concern.id, payload)
        : await addConcern({ roId, kind: "TECHNICIAN", ...payload });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      if (files.length > 0) {
        toast("success", "Concern saved. Media upload will be available when cloud storage is enabled.");
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      eyebrow="Repair order"
      title={isEdit ? "Edit technician concern" : "Technician concern"}
      description="Inspection task with G/Y/R rating for the bay and DVI."
      maxWidth="sm:max-w-xl"
      footer={
        <CrmDialogFooterButtons
          onCancel={() => handleOpenChange(false)}
          onSave={submit}
          pending={pending}
          saveLabel="Save concern"
        />
      }
    >
      <div className="space-y-4">
        <CrmFormSection title="Inspection rating" description="Required for technician concerns" accent="navy">
          <CrmFormField label="Rating" required>
            <Select
              value={rating || undefined}
              onValueChange={(v) => setRating(v as InspectionItemStatus)}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select rating">
                  {rating && rating !== "NA" ? <RatingOption status={rating} /> : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    <RatingOption status={status} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CrmFormField>
        </CrmFormSection>

        <CrmFormSection title="Inspection task" accent="light">
          <CrmFormField label="Task description" required>
            <Textarea
              id="tech-concern-task"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Describe the inspection task or tech finding."
              rows={4}
              required
              className={`resize-y min-h-[96px] ${inputClass}`}
            />
            <CharCounter value={text} />
          </CrmFormField>
        </CrmFormSection>

        <CrmFormSection title="Finding & media" accent="light">
          <CrmFormField label="Finding">
            <Textarea
              id="tech-concern-finding"
              value={finding}
              onChange={(e) => setFinding(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Enter finding..."
              rows={3}
              className={`resize-y min-h-[80px] ${inputClass}`}
            />
            <CharCounter value={finding} />
          </CrmFormField>
          <div className="mt-3">
            <ConcernMediaUpload files={files} onFilesChange={setFiles} disabled={pending} />
          </div>
        </CrmFormSection>

        {error ? <p className="text-sm text-brand-red">{error}</p> : null}
      </div>
    </CrmDialogShell>
  );
}
