"use client";

import { useState, useTransition } from "react";
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
import { addRoActivity } from "@/server/actions/ro-activity";
import { RoActivityType } from "@/generated/prisma";

const ACTIVITY_TYPES: { value: RoActivityType; label: string }[] = [
  { value: "NOTE", label: "Note" },
  { value: "PHONE_CALL", label: "Phone call" },
  { value: "EMAIL", label: "Email" },
  { value: "OTHER", label: "Other" },
];

const inputClass = "border-brand-light/40";

export function AddActivityDialog({
  open,
  onOpenChange,
  repairOrderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairOrderId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<RoActivityType>("NOTE");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType("NOTE");
    setDescription("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addRoActivity({ repairOrderId, type, description });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      eyebrow="Repair order"
      title="Add activity"
      description="Log a note, call, or email on this repair order timeline."
      footer={
        <CrmDialogFooterButtons
          onCancel={() => handleOpenChange(false)}
          onSave={submit}
          pending={pending}
          saveLabel="Save activity"
        />
      }
    >
      <CrmFormSection title="Activity entry" accent="navy">
          <CrmFormField label="Type">
            <Select value={type} onValueChange={(v) => setType(v as RoActivityType)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CrmFormField>
          <div className="mt-3">
            <CrmFormField label="Description" required>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What happened on this repair order?"
                required
                className={inputClass}
              />
            </CrmFormField>
          </div>
          {error ? <p className="mt-3 text-sm text-brand-red">{error}</p> : null}
      </CrmFormSection>
    </CrmDialogShell>
  );
}
