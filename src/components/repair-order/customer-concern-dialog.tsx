"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { CrmDialogFooterButtons, CrmDialogShell } from "@/components/crm/crm-dialog-shell";
import { CrmFormField } from "@/components/crm/crm-form-field";
import { CrmFormSection } from "@/components/crm/crm-form-section";
import { Textarea } from "@/components/ui/textarea";
import { ConcernMediaUpload } from "@/components/repair-order/concern-media-upload";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { addConcern, updateConcern } from "@/server/actions/concerns";
import type { ConcernRow } from "@/components/repair-order/concern-types";

const MAX_CHARS = 2000;
const inputClass = "border-brand-light/40";

function CharCounter({ value, max = MAX_CHARS }: { value: string; max?: number }) {
  const remaining = max - value.length;
  return (
    <p className="text-right text-xs text-muted-foreground">
      {remaining} character{remaining === 1 ? "" : "s"} remaining
    </p>
  );
}

export function CustomerConcernDialog({
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
  const [text, setText] = useState("");
  const [finding, setFinding] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(concern);

  useEffect(() => {
    if (!open) return;
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
      setError("Concern text is required.");
      return;
    }

    startTransition(async () => {
      const payload = { text: trimmed, finding: finding.trim() || null };
      const res = isEdit && concern
        ? await updateConcern(concern.id, payload)
        : await addConcern({ roId, kind: "CUSTOMER", ...payload });

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
      title={isEdit ? "Edit customer concern" : "Customer concern"}
      description="What the customer reported — appears on the estimate and work order."
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
        <CrmFormSection title="Customer reported" description="Required for estimate building" accent="navy">
          <CrmFormField label="Concern" required>
            <Textarea
              id="customer-concern-text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Describe the customer's concern."
              rows={4}
              required
              className={`resize-y min-h-[96px] ${inputClass}`}
            />
            <CharCounter value={text} />
          </CrmFormField>
        </CrmFormSection>

        <CrmFormSection title="Shop finding" description="Optional — cause or diagnosis notes" accent="light">
          <CrmFormField label="Finding">
            <Textarea
              id="customer-concern-finding"
              value={finding}
              onChange={(e) => setFinding(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Describe the cause."
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
