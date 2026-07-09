"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CrmDialogFooterButtons, CrmDialogShell } from "@/components/crm/crm-dialog-shell";
import { CrmFormField } from "@/components/crm/crm-form-field";
import { CrmFormSection } from "@/components/crm/crm-form-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRepairOrderSidebar, updateRepairOrderMileage } from "@/server/actions/repair-orders";

const CLEAR_VALUE = "__none__";
const inputClass = "border-brand-light/40";

export function SelectFieldDialog({
  open,
  onOpenChange,
  title,
  label,
  value,
  options,
  allowClear,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  allowClear?: boolean;
  onSave: (value: string | null) => Promise<{ ok: boolean; error?: string }>;
}) {
  const toSelect = (v: string | null) => (v && v.length ? v : allowClear ? CLEAR_VALUE : "");
  const [selected, setSelected] = useState(toSelect(value));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setSelected(toSelect(value));
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const out = selected === CLEAR_VALUE || !selected ? null : selected;
      const res = await onSave(out);
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setSelected(toSelect(value));
        else reset();
      }}
      eyebrow="Repair order"
      title={title}
      description="Quick edit — saves to this order immediately."
      footer={
        <CrmDialogFooterButtons
          onCancel={() => onOpenChange(false)}
          onSave={submit}
          pending={pending}
        />
      }
    >
      <CrmFormSection title="Field value" accent="light">
        <CrmFormField label={label}>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {allowClear ? <SelectItem value={CLEAR_VALUE}>None</SelectItem> : null}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CrmFormField>
        {error ? <p className="mt-3 text-sm text-brand-red">{error}</p> : null}
      </CrmFormSection>
    </CrmDialogShell>
  );
}

export function TextFieldDialog({
  open,
  onOpenChange,
  title,
  label,
  value,
  multiline,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  value: string | null;
  multiline?: boolean;
  onSave: (value: string | null) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [text, setText] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText(value ?? "");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await onSave(text.trim() || null);
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setText(value ?? "");
        else reset();
      }}
      eyebrow="Repair order"
      title={title}
      description="Quick edit — saves to this order immediately."
      footer={
        <CrmDialogFooterButtons
          onCancel={() => onOpenChange(false)}
          onSave={submit}
          pending={pending}
        />
      }
    >
      <CrmFormSection title="Field value" accent="light">
        <CrmFormField label={label}>
          {multiline ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className={inputClass}
            />
          ) : (
            <Input value={text} onChange={(e) => setText(e.target.value)} className={inputClass} />
          )}
        </CrmFormField>
        {error ? <p className="mt-3 text-sm text-brand-red">{error}</p> : null}
      </CrmFormSection>
    </CrmDialogShell>
  );
}

export function DateTimeFieldDialog({
  open,
  onOpenChange,
  title,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: Date | string | null;
  onSave: (value: string | null) => Promise<{ ok: boolean; error?: string }>;
}) {
  const toLocalInput = (d: Date | string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  const [text, setText] = useState(toLocalInput(value));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText(toLocalInput(value));
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const iso = text ? new Date(text).toISOString() : null;
      const res = await onSave(iso);
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setText(toLocalInput(value));
        else reset();
      }}
      eyebrow="Repair order"
      title={title}
      description="Set when this job is promised back to the customer."
      footer={
        <CrmDialogFooterButtons
          onCancel={() => onOpenChange(false)}
          onSave={submit}
          pending={pending}
        />
      }
    >
      <CrmFormSection title="Promise time" accent="light">
        <CrmFormField label="Date & time">
          <Input
            type="datetime-local"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
        </CrmFormField>
        {error ? <p className="mt-3 text-sm text-brand-red">{error}</p> : null}
      </CrmFormSection>
    </CrmDialogShell>
  );
}

/** Hook wrapping updateRepairOrderSidebar with router.refresh(). */
export function useRoSidebarSave(roId: string) {
  const router = useRouter();
  return async (patch: Omit<Parameters<typeof updateRepairOrderSidebar>[0], "roId">) => {
    const res = await updateRepairOrderSidebar({ roId, ...patch });
    if (res.ok) router.refresh();
    return res;
  };
}

/** Hook wrapping updateRepairOrderMileage with router.refresh(). */
export function useRoMileageSave(repairOrderId: string) {
  const router = useRouter();
  return async (patch: Omit<Parameters<typeof updateRepairOrderMileage>[0], "repairOrderId">) => {
    const res = await updateRepairOrderMileage({ repairOrderId, ...patch });
    if (res.ok) router.refresh();
    return res;
  };
}

export function MileageInDialog({
  open,
  onOpenChange,
  mileageIn,
  odometerNotWorking,
  reqOdometer,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mileageIn: number | null;
  odometerNotWorking: boolean;
  reqOdometer?: boolean;
  onSave: (patch: {
    mileageIn: number | null;
    odometerNotWorking: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [text, setText] = useState(mileageIn != null ? String(mileageIn) : "");
  const [notWorking, setNotWorking] = useState(odometerNotWorking);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText(mileageIn != null ? String(mileageIn) : "");
    setNotWorking(odometerNotWorking);
    setError(null);
  }

  function submit() {
    setError(null);
    if (reqOdometer && !notWorking && !text.trim()) {
      setError("Odometer in is required.");
      return;
    }
    startTransition(async () => {
      const miles = notWorking || !text.trim() ? null : Number(text);
      if (miles != null && (!Number.isInteger(miles) || miles < 0)) {
        setError("Enter a valid odometer reading.");
        return;
      }
      const res = await onSave({ mileageIn: miles, odometerNotWorking: notWorking });
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) reset();
        else reset();
      }}
      eyebrow="Repair order"
      title="Odometer in"
      description="Capture mileage at drop-off for this visit."
      footer={
        <CrmDialogFooterButtons
          onCancel={() => onOpenChange(false)}
          onSave={submit}
          pending={pending}
        />
      }
    >
      <CrmFormSection title="Mileage reading" accent="navy">
        <CrmFormField label={`Odometer reading${reqOdometer && !notWorking ? " *" : ""}`}>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Enter odometer in"
            disabled={notWorking}
            className={cnInput(notWorking)}
          />
        </CrmFormField>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <Checkbox
            checked={notWorking}
            onCheckedChange={(v) => {
              const checked = !!v;
              setNotWorking(checked);
              if (checked) setText("");
            }}
          />
          Odometer not working
        </label>
        {error ? <p className="mt-3 text-sm text-brand-red">{error}</p> : null}
      </CrmFormSection>
    </CrmDialogShell>
  );
}

export function MileageOutDialog({
  open,
  onOpenChange,
  mileageOut,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mileageOut: number | null;
  onSave: (mileageOut: number | null) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [text, setText] = useState(mileageOut != null ? String(mileageOut) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText(mileageOut != null ? String(mileageOut) : "");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const miles = text.trim() ? Number(text) : null;
      if (miles != null && (!Number.isInteger(miles) || miles < 0)) {
        setError("Enter a valid odometer reading.");
        return;
      }
      const res = await onSave(miles);
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) reset();
        else reset();
      }}
      eyebrow="Repair order"
      title="Odometer out"
      description="Record mileage when the vehicle leaves the shop."
      footer={
        <CrmDialogFooterButtons
          onCancel={() => onOpenChange(false)}
          onSave={submit}
          pending={pending}
        />
      }
    >
      <CrmFormSection title="Mileage reading" accent="navy">
        <CrmFormField label="Odometer reading">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Enter odometer out"
            className={inputClass}
          />
        </CrmFormField>
        {error ? <p className="mt-3 text-sm text-brand-red">{error}</p> : null}
      </CrmFormSection>
    </CrmDialogShell>
  );
}

function cnInput(disabled?: boolean) {
  return disabled ? `${inputClass} bg-muted/40` : inputClass;
}
