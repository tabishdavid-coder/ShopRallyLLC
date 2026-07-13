"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createInventoryPart,
  updateInventoryPart,
  type CreateInventoryPartInput,
} from "@/server/actions/inventory";
import type { InventoryPartDetail } from "@/server/inventory";

const CATEGORIES = [
  "Filters",
  "Brakes",
  "Fluids",
  "Electrical",
  "Engine",
  "Suspension",
  "Belts & Hoses",
  "Ignition",
  "Exhaust",
  "Other",
];

/** Free-text input + suggestion list anchored under the field (avoids native datalist mis-position in overflow shells). */
function SuggestInput({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const filtered = options.filter((opt) =>
    value.trim() ? opt.toLowerCase().includes(value.trim().toLowerCase()) : true,
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className="pr-8"
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show category suggestions"
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </div>
      {open && filtered.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto",
            "rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md",
          )}
        >
          {filtered.map((opt) => (
            <li key={opt} role="option" aria-selected={opt === value}>
              <button
                type="button"
                className={cn(
                  "flex w-full px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  opt === value && "bg-accent/60 font-medium",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
function dollarsToCents(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

type FormState = {
  partNumber: string;
  description: string;
  brand: string;
  category: string;
  vendorName: string;
  vendorPartNumber: string;
  quantityOnHand: string;
  reorderPoint: string;
  reorderQty: string;
  cost: string;
  retail: string;
  binLocation: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    partNumber: "",
    description: "",
    brand: "",
    category: "",
    vendorName: "",
    vendorPartNumber: "",
    quantityOnHand: "0",
    reorderPoint: "0",
    reorderQty: "0",
    cost: "0.00",
    retail: "0.00",
    binLocation: "",
    notes: "",
  };
}

function fromPart(part: InventoryPartDetail): FormState {
  return {
    partNumber: part.partNumber,
    description: part.description,
    brand: part.brand ?? "",
    category: part.category ?? "",
    vendorName: part.vendorName ?? "",
    vendorPartNumber: part.vendorPartNumber ?? "",
    quantityOnHand: String(part.quantityOnHand),
    reorderPoint: String(part.reorderPoint),
    reorderQty: String(part.reorderQty),
    cost: centsToInput(part.costCents),
    retail: centsToInput(part.retailCents),
    binLocation: part.binLocation ?? "",
    notes: part.notes ?? "",
  };
}

function toPayload(form: FormState): CreateInventoryPartInput {
  return {
    partNumber: form.partNumber,
    description: form.description,
    brand: form.brand || undefined,
    category: form.category || undefined,
    vendorName: form.vendorName || undefined,
    vendorPartNumber: form.vendorPartNumber || undefined,
    quantityOnHand: parseInt(form.quantityOnHand, 10) || 0,
    reorderPoint: parseInt(form.reorderPoint, 10) || 0,
    reorderQty: parseInt(form.reorderQty, 10) || 0,
    costCents: dollarsToCents(form.cost),
    retailCents: dollarsToCents(form.retail),
    binLocation: form.binLocation || undefined,
    notes: form.notes || undefined,
  };
}

export function InventoryPartForm({
  part,
  mode = "create",
}: {
  part?: InventoryPartDetail;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(part ? fromPart(part) : emptyForm());
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent, addAnother = false) {
    e.preventDefault();
    setError(null);
    if (!form.partNumber.trim() || !form.description.trim()) {
      setError("Part number and description are required.");
      return;
    }
    startTransition(async () => {
      const payload = toPayload(form);
      const result =
        mode === "edit" && part
          ? await updateInventoryPart({ ...payload, id: part.id })
          : await createInventoryPart(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (addAnother) {
        setForm(emptyForm());
        router.refresh();
        return;
      }
      router.push(mode === "edit" ? `/inventory/${result.id}` : "/inventory");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => handleSubmit(e, false)}
      className="mx-auto max-w-3xl rounded-xl border bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">
        {mode === "edit" ? "Edit part" : "Add part"}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Track part number, vendor, quantity on hand, and pricing.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="partNumber">Part number *</Label>
          <Input
            id="partNumber"
            value={form.partNumber}
            onChange={(e) => setField("partNumber", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Part name / description *</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <SuggestInput
            id="category"
            value={form.category}
            onChange={(next) => setField("category", next)}
            options={CATEGORIES}
            placeholder="Filters, Brakes…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={form.brand}
            onChange={(e) => setField("brand", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendorName">Vendor</Label>
          <Input
            id="vendorName"
            value={form.vendorName}
            onChange={(e) => setField("vendorName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendorPartNumber">Vendor part #</Label>
          <Input
            id="vendorPartNumber"
            value={form.vendorPartNumber}
            onChange={(e) => setField("vendorPartNumber", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="binLocation">Bin location</Label>
          <Input
            id="binLocation"
            value={form.binLocation}
            onChange={(e) => setField("binLocation", e.target.value)}
            placeholder="A1-B2"
          />
        </div>
        {mode === "create" ? (
          <div className="space-y-2">
            <Label htmlFor="quantityOnHand">In-stock quantity *</Label>
            <Input
              id="quantityOnHand"
              type="number"
              min={0}
              value={form.quantityOnHand}
              onChange={(e) => setField("quantityOnHand", e.target.value)}
              required
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="reorderPoint">Minimum stock (reorder point)</Label>
          <Input
            id="reorderPoint"
            type="number"
            min={0}
            value={form.reorderPoint}
            onChange={(e) => setField("reorderPoint", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorderQty">Reorder quantity</Label>
          <Input
            id="reorderQty"
            type="number"
            min={0}
            value={form.reorderQty}
            onChange={(e) => setField("reorderQty", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Unit cost *</Label>
          <Input
            id="cost"
            inputMode="decimal"
            value={form.cost}
            onChange={(e) => setField("cost", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retail">Retail price *</Label>
          <Input
            id="retail"
            inputMode="decimal"
            value={form.retail}
            onChange={(e) => setField("retail", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Additional details</Label>
          <Textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-brand-red">{error}</p> : null}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href={mode === "edit" && part ? `/inventory/${part.id}` : "/inventory"}>
            Cancel
          </Link>
        </Button>
        {mode === "create" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={(e) => handleSubmit(e, true)}
          >
            Save &amp; add another
          </Button>
        ) : null}
        <Button type="submit" disabled={pending} className="bg-brand-navy">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}
