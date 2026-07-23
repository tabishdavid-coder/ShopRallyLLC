"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { DollarsInput, HoursInput } from "@/components/canned-jobs/canned-job-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/format";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";
import {
  deleteShopLaborItem,
  fetchShopLaborItemsForManage,
  saveShopLaborItem,
} from "@/server/actions/shop-labor-items";
import { cn } from "@/lib/utils";

type LaborFormFields = {
  name: string;
  defaultHours: number;
  rateCents: number;
  isActive: boolean;
};

const emptyForm = (rateCents: number): LaborFormFields => ({
  name: "",
  defaultHours: 1,
  rateCents,
  isActive: true,
});

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        active
          ? "bg-emerald-600/10 text-emerald-800"
          : "bg-muted text-muted-foreground",
      )}
    >
      {active ? "Active" : "Off"}
    </span>
  );
}

function ActiveToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active ? "bg-brand-navy" : "bg-muted-foreground/25",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          active ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function LaborFormRow({
  form,
  onChange,
  onSave,
  onCancel,
  pending,
  saveLabel,
  showCancel,
}: {
  form: LaborFormFields;
  onChange: (next: LaborFormFields) => void;
  onSave: () => void;
  onCancel?: () => void;
  pending: boolean;
  saveLabel: string;
  showCancel?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_6.5rem_4.5rem_auto] sm:items-end">
      <div className="min-w-0">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Name
        </label>
        <Input
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Maintenance Labor"
          className="h-8 text-xs"
          autoFocus={!showCancel}
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Default hrs
        </label>
        <HoursInput
          hours={form.defaultHours}
          onCommit={(defaultHours) => onChange({ ...form, defaultHours })}
          placeholder="1.0"
          className="h-8 text-right text-xs tabular-nums"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Rate / hr
        </label>
        <DollarsInput
          cents={form.rateCents}
          onCommit={(rateCents) => onChange({ ...form, rateCents })}
          placeholder="150.00"
          className="h-8 text-right text-xs tabular-nums"
        />
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Active
        </span>
        <ActiveToggle
          active={form.isActive}
          onChange={(isActive) => onChange({ ...form, isActive })}
          disabled={pending}
        />
      </div>
      <div className="flex items-end justify-end gap-1.5 sm:justify-start">
        {showCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="h-8 bg-brand-navy px-3 text-xs hover:bg-brand-navy/90"
          onClick={onSave}
          disabled={pending || !form.name.trim()}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** Manage shop labor catalog items used by canned job labor pickers. */
export function ShopLaborManageDialog({
  open,
  onOpenChange,
  laborRateCents = 15000,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laborRateCents?: number;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<ShopLaborItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<LaborFormFields>(() => emptyForm(laborRateCents));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LaborFormFields>(() => emptyForm(laborRateCents));
  const [pending, start] = useTransition();

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchShopLaborItemsForManage();
      if (res.ok) setItems(res.items ?? []);
      else setError(res.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setAddForm(emptyForm(laborRateCents));
    void loadItems();
  }, [open, laborRateCents]);

  function notifyChanged() {
    void loadItems();
    onChanged?.();
  }

  function startEdit(item: ShopLaborItemRow) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      defaultHours: item.defaultHours,
      rateCents: item.rateCents,
      isActive: item.isActive,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  function saveFields(fields: LaborFormFields, id?: string) {
    if (!fields.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveShopLaborItem({
        id,
        name: fields.name.trim(),
        defaultHours: fields.defaultHours,
        rateCents: fields.rateCents,
        costCents: 0,
        taxable: true,
        isActive: fields.isActive,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (id) setEditingId(null);
      else setAddForm(emptyForm(laborRateCents));
      notifyChanged();
    });
  }

  function removeItem(item: ShopLaborItemRow) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteShopLaborItem(item.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (editingId === item.id) setEditingId(null);
      notifyChanged();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,720px)] w-[min(56rem,calc(100vw-1.5rem))] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-brand-navy">
            Shop labor rates
          </DialogTitle>
          <DialogDescription className="text-xs">
            Labor items appear in the canned job picker. Default hours and rate apply when you
            select one.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 rounded-lg border border-dashed border-brand-navy/20 bg-slate-50/80 px-3 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <Plus className="size-3.5" aria-hidden />
              Add labor
            </p>
            <LaborFormRow
              form={addForm}
              onChange={setAddForm}
              onSave={() => saveFields(addForm)}
              pending={pending}
              saveLabel="Add"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mb-3 rounded-md border border-brand-red/25 bg-brand-red/5 px-3 py-2 text-xs font-medium text-brand-red"
            >
              {error}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-[0.06em]">
                    Name
                  </TableHead>
                  <TableHead className="h-9 w-[5.5rem] text-right text-[10px] font-semibold uppercase tracking-[0.06em]">
                    Default hrs
                  </TableHead>
                  <TableHead className="h-9 w-[6.5rem] text-right text-[10px] font-semibold uppercase tracking-[0.06em]">
                    Rate / hr
                  </TableHead>
                  <TableHead className="h-9 w-[4.5rem] text-center text-[10px] font-semibold uppercase tracking-[0.06em]">
                    Active
                  </TableHead>
                  <TableHead className="h-9 w-[5.5rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                      Loading labor items…
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-xs text-muted-foreground">
                      No labor items yet. Add one above to populate the picker.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const editing = editingId === item.id;
                    if (editing) {
                      return (
                        <TableRow key={item.id} className="bg-brand-light/[0.06]">
                          <TableCell colSpan={5} className="py-3">
                            <LaborFormRow
                              form={editForm}
                              onChange={setEditForm}
                              onSave={() => saveFields(editForm, item.id)}
                              onCancel={cancelEdit}
                              pending={pending}
                              saveLabel="Save"
                              showCancel
                            />
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={item.id} className="group">
                        <TableCell className="py-2 text-xs font-medium">{item.name}</TableCell>
                        <TableCell className="py-2 text-right text-xs tabular-nums">
                          {item.defaultHours > 0 ? item.defaultHours.toFixed(2) : "Flat"}
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs tabular-nums">
                          {item.rateCents > 0 ? `${formatCents(item.rateCents)}/hr` : "—"}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <ActiveBadge active={item.isActive} />
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 text-muted-foreground hover:text-brand-navy"
                              onClick={() => startEdit(item)}
                              disabled={pending}
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(item)}
                              disabled={pending}
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-border bg-slate-50/90 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-border bg-white"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onOpenChange(false)}
          className="absolute right-2 top-2 size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
