"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  GripVertical,
  ListChecks,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createShopInspectionTemplate } from "@/server/actions/inspection-templates";

type ChecklistItem = {
  key: string;
  name: string;
  category: string;
};

type WizardStep = "details" | "checklist" | "review";

const STEPS: { id: WizardStep; label: string; icon: typeof ClipboardList }[] = [
  { id: "details", label: "Details", icon: ClipboardList },
  { id: "checklist", label: "Checklist", icon: ListChecks },
  { id: "review", label: "Review", icon: CheckCircle2 },
];

function newItem(category = "General"): ChecklistItem {
  return {
    key: crypto.randomUUID(),
    name: "",
    category,
  };
}

function emptyForm() {
  return {
    name: "",
    description: "",
    items: [newItem("Brakes"), newItem("Brakes")],
    attachToRo: true,
  };
}

function groupItems(items: ChecklistItem[]): { category: string; items: ChecklistItem[] }[] {
  const map = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const category = item.category.trim() || "General";
    const bucket = map.get(category) ?? [];
    bucket.push(item);
    map.set(category, bucket);
  }
  return Array.from(map.entries()).map(([category, groupItems]) => ({
    category,
    items: groupItems,
  }));
}

export function CreateInspectionTemplateSheet({
  open,
  onOpenChange,
  roId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId?: string;
  onCreated?: (result: { templateId: string; inspectionId?: string }) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const currentStep = STEPS[stepIndex]?.id ?? "details";
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;
  const grouped = useMemo(() => groupItems(form.items), [form.items]);
  const validItems = form.items.filter(
    (item) => item.name.trim() && item.category.trim(),
  );

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setStepIndex(0);
      setNewCategory("");
      setError(null);
    }
  }, [open]);

  function canContinue(): boolean {
    if (currentStep === "details") return form.name.trim().length > 0;
    if (currentStep === "checklist") return validItems.length > 0;
    return true;
  }

  function goToStep(index: number) {
    if (index > 0 && !form.name.trim()) {
      setError("Template name is required.");
      setStepIndex(0);
      return;
    }
    setStepIndex(index);
    setError(null);
  }

  function goNext() {
    if (!canContinue()) {
      if (currentStep === "details") setError("Template name is required.");
      if (currentStep === "checklist") setError("Add at least one checklist item with a name.");
      return;
    }
    setError(null);
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  }

  function goBack() {
    setError(null);
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function updateItem(key: string, patch: Partial<ChecklistItem>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(key: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.key !== key),
    }));
  }

  function moveItem(key: string, direction: -1 | 1) {
    setForm((prev) => {
      const idx = prev.items.findIndex((item) => item.key === key);
      if (idx < 0) return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.items.length) return prev;
      const items = [...prev.items];
      [items[idx], items[nextIdx]] = [items[nextIdx], items[idx]];
      return { ...prev, items };
    });
  }

  function addCategory() {
    const category = newCategory.trim() || "General";
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem(category)],
    }));
    setNewCategory("");
  }

  function addItemToCategory(category: string) {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem(category)],
    }));
  }

  function save() {
    if (!form.name.trim()) {
      setError("Template name is required.");
      setStepIndex(0);
      return;
    }
    if (validItems.length === 0) {
      setError("Add at least one checklist item.");
      setStepIndex(1);
      return;
    }

    setError(null);
    start(async () => {
      const res = await createShopInspectionTemplate({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        items: validItems.map((item) => ({
          name: item.name.trim(),
          category: item.category.trim(),
        })),
        attachToRepairOrderId: roId && form.attachToRo ? roId : undefined,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      onOpenChange(false);
      onCreated?.({ templateId: res.templateId, inspectionId: res.inspectionId });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-w-6xl sm:rounded-2xl lg:max-w-7xl"
      >
        <div className="relative shrink-0 bg-brand-navy px-5 py-4 text-white sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="absolute right-4 top-4 text-white hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>

          <DialogTitle className="pr-10 text-lg font-semibold text-white sm:text-xl">
            Create custom inspection
          </DialogTitle>
          <DialogDescription className="mt-1 max-w-2xl text-sm text-white/75">
            Step {stepIndex + 1} of {STEPS.length} — build a reusable checklist for your shop.
            Items are rated red / yellow / green when performing the inspection.
          </DialogDescription>

          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-0.5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active && "bg-white text-brand-navy shadow-sm",
                    done && !active && "bg-white/20 text-white hover:bg-white/30",
                    !active && !done && "bg-white/10 text-white/55",
                  )}
                >
                  <Icon className="size-3.5" />
                  {step.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-6">
          {currentStep === "details" ? (
            <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template name</Label>
                  <Input
                    id="template-name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Seasonal Safety Inspection"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-description">Description (optional)</Label>
                  <Textarea
                    id="template-description"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="When advisors should use this checklist…"
                    rows={4}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-brand-light/40 bg-brand-light/10 p-4">
                <p className="text-sm font-semibold text-brand-navy">Tips</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>Use a clear name — it appears on the RO and customer share link.</li>
                  <li>Group items by category (Brakes, Tires, Under Hood) in the next step.</li>
                  <li>Each template can only be added once per repair order.</li>
                </ul>
              </div>
            </div>
          ) : null}

          {currentStep === "checklist" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                <div className="min-w-[180px] flex-1 space-y-1">
                  <Label htmlFor="new-category">New category</Label>
                  <Input
                    id="new-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Fluids"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCategory();
                      }
                    }}
                  />
                </div>
                <Button type="button" variant="outline" className="gap-1.5" onClick={addCategory}>
                  <Plus className="size-4" />
                  Add category
                </Button>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {grouped.map((group) => (
                  <section key={group.category} className="rounded-xl border bg-card shadow-sm">
                    <header className="flex items-center justify-between border-b px-4 py-3">
                      <h3 className="text-sm font-semibold text-brand-navy">{group.category}</h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => addItemToCategory(group.category)}
                      >
                        <Plus className="size-3.5" />
                        Add item
                      </Button>
                    </header>
                    <ul className="divide-y">
                      {group.items.map((item) => (
                        <li key={item.key} className="flex items-start gap-2 px-3 py-2.5">
                          <GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground/50" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(item.key, { name: e.target.value })}
                              placeholder="Checklist item name"
                              className="h-9"
                            />
                            <Input
                              value={item.category}
                              onChange={(e) => updateItem(item.key, { category: e.target.value })}
                              placeholder="Category"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Move item up"
                              onClick={() => moveItem(item.key, -1)}
                            >
                              <ArrowLeft className="size-3.5 rotate-90" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Move item down"
                              onClick={() => moveItem(item.key, 1)}
                            >
                              <ArrowRight className="size-3.5 rotate-90" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label="Remove item"
                              onClick={() => removeItem(item.key)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              {form.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Add a category to start building your checklist.
                </p>
              ) : null}
            </div>
          ) : null}

          {currentStep === "review" ? (
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Template
                  </p>
                  <p className="mt-1 text-lg font-semibold text-brand-navy">{form.name.trim()}</p>
                  {form.description.trim() ? (
                    <p className="mt-2 text-sm text-muted-foreground">{form.description.trim()}</p>
                  ) : null}
                  <p className="mt-3 text-sm text-muted-foreground">
                    {validItems.length} checklist item{validItems.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="space-y-3">
                  {groupItems(validItems).map((group) => (
                    <div key={group.category} className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
                        {group.category}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-foreground">
                        {group.items.map((item) => (
                          <li key={item.key}>• {item.name.trim()}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {roId ? (
                  <div className="rounded-xl border border-brand-light/40 bg-brand-light/10 p-4">
                    <label className="flex items-start gap-3">
                      <Checkbox
                        checked={form.attachToRo}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({ ...prev, attachToRo: checked === true }))
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-sm font-medium text-brand-navy">
                          Add to this repair order
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          Save the template and start this inspection on the current RO in one step.
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}

                <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                  Saved templates appear in the Add Inspection picker for all future repair orders
                  on this shop.
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4 sm:px-6">
          <div>
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" onClick={goBack} disabled={pending}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep !== "review" ? (
              <Button type="button" onClick={goNext} disabled={pending}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={save} disabled={pending} className="gap-1.5">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Save template
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
