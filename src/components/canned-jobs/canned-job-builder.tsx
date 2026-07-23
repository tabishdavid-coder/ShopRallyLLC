"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Check,
  CircleDollarSign,
  Package,
  Plus,
  Settings2,
  Wrench,
  X,
} from "lucide-react";

import {
  CategorySelectField,
  DollarsInput,
  HoursInput,
  LaborDollarsInput,
  feeLineAmountCents,
  laborLineAmountCents,
  type CannedJobFormState,
  type FeeRow,
  type LaborRow,
  type PartRow,
} from "@/components/canned-jobs/canned-job-form";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";
import { ShopLaborPickerInput } from "@/components/canned-jobs/shop-labor-picker-input";
import { ShopLaborManageDialog } from "@/components/canned-jobs/shop-labor-manage-dialog";
import {
  amountDisplay,
  parseAmountInput,
  type AdjustBase,
  type AdjustMethod,
} from "@/components/estimate-building/estimate-lab-adjustment-shared";
import type { ShopFeeTemplateRow } from "@/server/actions/canned-jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const cellInput =
  "h-8 min-h-8 border-0 border-b border-transparent bg-transparent px-1.5 text-xs shadow-none rounded-none " +
  "hover:border-border focus-visible:border-brand-navy/50 focus-visible:ring-0";

const cellNumeric =
  "h-8 min-h-8 w-full min-w-[3.5rem] border-0 border-b border-transparent bg-transparent px-1.5 text-right text-xs tabular-nums shadow-none rounded-none " +
  "hover:border-border focus-visible:border-brand-navy/50 focus-visible:ring-0";

const cellSelect =
  "h-8 w-full cursor-pointer rounded border-0 border-b border-transparent bg-transparent px-1 text-xs shadow-none " +
  "hover:border-border focus-visible:border-brand-navy/50 focus-visible:outline-none";

type UnifiedRow =
  | { kind: "labor"; index: number; row: LaborRow }
  | { kind: "part"; index: number; row: PartRow }
  | { kind: "fee"; index: number; row: FeeRow };

type ActiveLineKind = "labor" | "part" | "fee";

type LineOption =
  | { value: ActiveLineKind; label: string; disabled?: false }
  | { value: string; label: string; disabled: true; title: string };

const LINE_OPTIONS: LineOption[] = [
  { value: "labor", label: "Labor" },
  { value: "part", label: "Part" },
  { value: "fee", label: "Fee" },
  { value: "tire", label: "Tire", disabled: true, title: "Coming soon" },
  { value: "sublet", label: "Sublet", disabled: true, title: "Coming soon" },
  { value: "other", label: "Other", disabled: true, title: "Coming soon" },
  { value: "discount", label: "Discount", disabled: true, title: "Coming soon" },
  { value: "inspection", label: "Inspection", disabled: true, title: "Coming soon" },
];

const BASE_LABELS: Record<AdjustBase, string> = {
  LABOR: "Labor",
  PARTS: "Parts",
  LABOR_PARTS: "L+P",
};

function ActiveToggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
      <span className="text-[11px] font-medium text-muted-foreground">Active</span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => onChange(!active)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2",
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
    </label>
  );
}

function TypeBadge({ kind }: { kind: ActiveLineKind }) {
  const config = {
    labor: { Icon: Wrench, label: "Labor", className: "bg-brand-navy/12 text-brand-navy" },
    part: { Icon: Package, label: "Part", className: "bg-brand-light/40 text-brand-navy" },
    fee: { Icon: CircleDollarSign, label: "Fee", className: "bg-brand-red/10 text-brand-red" },
  }[kind];

  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "flex w-full min-h-8 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-bold uppercase leading-none tracking-wide",
        config.className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {config.label}
    </span>
  );
}

function TaxableCell({ checked = true }: { checked?: boolean }) {
  if (!checked) {
    return (
      <div className="flex justify-center" title="Not taxable">
        <span className="inline-flex size-5 items-center justify-center rounded border border-border bg-muted/30 text-muted-foreground/40">
          <span className="sr-only">Not taxable</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center" title="Taxable by default when added to an estimate">
      <span className="inline-flex size-5 items-center justify-center rounded border border-emerald-600/25 bg-emerald-600/8 text-emerald-800">
        <Check className="size-3" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Taxable</span>
      </span>
    </div>
  );
}

function FeeAmountInput({
  fee,
  onCommit,
  className,
}: {
  fee: FeeRow;
  onCommit: (amount: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = amountDisplay(fee);
  const value = draft ?? (fee.amount === 0 ? "" : display);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
      }}
      onFocus={(e) => {
        setDraft(fee.amount === 0 ? "" : display);
        e.target.select();
      }}
      onBlur={() => {
        if (draft === null) return;
        const parsed = parseAmountInput(draft);
        onCommit(parsed ?? 0);
        setDraft(null);
      }}
      placeholder={fee.method === "PERCENT" ? "0" : "0.00"}
      className={className}
      aria-label={fee.method === "PERCENT" ? "Fee percent" : "Fee amount"}
    />
  );
}

export function CannedJobBuilderForm({
  form,
  setForm,
  laborRateCents = 15000,
  shopLaborItems = [],
  shopFeeTemplates = [],
  onLaborItemsChanged,
  idPrefix = "cj-builder",
}: {
  form: CannedJobFormState;
  setForm: Dispatch<SetStateAction<CannedJobFormState>>;
  laborRateCents?: number;
  shopLaborItems?: ShopLaborItemRow[];
  shopFeeTemplates?: ShopFeeTemplateRow[];
  onLaborItemsChanged?: () => void;
  idPrefix?: string;
}) {
  const [showDescription, setShowDescription] = useState(() => Boolean(form.description.trim()));
  const [pendingType, setPendingType] = useState<"" | ActiveLineKind>("");
  const [manageLaborOpen, setManageLaborOpen] = useState(false);

  const costBasis = useMemo(() => {
    const laborCostCents = form.labor.reduce(
      (s, l) => s + laborLineAmountCents(l, laborRateCents),
      0,
    );
    const partsCostCents = form.parts.reduce((s, p) => s + p.costCents * p.quantity, 0);
    return { laborCostCents, partsCostCents };
  }, [form.labor, form.parts, laborRateCents]);

  const unifiedRows: UnifiedRow[] = useMemo(() => {
    const laborRows: UnifiedRow[] = form.labor.map((row, index) => ({
      kind: "labor" as const,
      index,
      row,
    }));
    const partRows: UnifiedRow[] = form.parts.map((row, index) => ({
      kind: "part" as const,
      index,
      row,
    }));
    const feeRows: UnifiedRow[] = form.fees.map((row, index) => ({
      kind: "fee" as const,
      index,
      row,
    }));
    return [...laborRows, ...partRows, ...feeRows];
  }, [form.labor, form.parts, form.fees]);

  const addLabor = () =>
    setForm((f) => ({
      ...f,
      labor: [...f.labor, { name: "", description: "", hours: 0, flatAmountCents: null }],
    }));

  const addPart = () =>
    setForm((f) => ({
      ...f,
      parts: [
        ...f.parts,
        { brand: "", description: "", partNumber: "", costCents: 0, quantity: 1 },
      ],
    }));

  const addFee = (template?: ShopFeeTemplateRow) =>
    setForm((f) => ({
      ...f,
      fees: [
        ...f.fees,
        template
          ? {
              name: template.name,
              method: template.method,
              base: template.base,
              amount: template.amount,
              capCents: template.capCents,
              taxable: template.taxable,
            }
          : {
              name: "",
              method: "FIXED" as AdjustMethod,
              base: "LABOR_PARTS" as AdjustBase,
              amount: 0,
              capCents: null,
              taxable: false,
            },
      ],
    }));

  const addLine = (kind: ActiveLineKind) => {
    if (kind === "labor") addLabor();
    else if (kind === "part") addPart();
    else addFee();
    setPendingType("");
  };

  const removeRow = (item: UnifiedRow) => {
    if (item.kind === "labor") {
      setForm((f) => ({ ...f, labor: f.labor.filter((_, i) => i !== item.index) }));
    } else if (item.kind === "part") {
      setForm((f) => ({ ...f, parts: f.parts.filter((_, i) => i !== item.index) }));
    } else {
      setForm((f) => ({ ...f, fees: f.fees.filter((_, i) => i !== item.index) }));
    }
  };

  const setCategory = (category: string) => setForm((f) => ({ ...f, category }));

  const tableHead =
    "px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

  return (
    <div className="min-w-0 space-y-5">
      <div className="space-y-3 border-b border-border pb-4">
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Enter canned job name"
          className={cn(
            "h-auto min-h-[2.75rem] border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none",
            "placeholder:text-muted-foreground/45 focus-visible:ring-0",
            "border-b border-transparent focus-visible:border-brand-navy/30 rounded-none pb-1",
          )}
          aria-label="Canned job name"
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Tags
            </p>
            <CategorySelectField
              category={form.category}
              onCategoryChange={setCategory}
              idPrefix={idPrefix}
              variant="chips"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-brand-orange px-3 text-xs font-semibold text-white shadow-md hover:bg-brand-orange/90 active:bg-brand-orange/85"
              onClick={() => setManageLaborOpen(true)}
            >
              <Settings2 className="size-3.5" aria-hidden />
              Labor rates
            </Button>
            <ActiveToggle
              active={form.isActive}
              onChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
            />
          </div>
        </div>

        {showDescription ? (
          <Textarea
            id={`${idPrefix}-desc`}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional notes when this job is applied to an estimate"
            rows={2}
            className="min-h-[4rem] resize-y border-border bg-white text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className="text-xs font-medium text-brand-navy/80 underline-offset-2 hover:text-brand-navy hover:underline"
          >
            + Add description
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className={cn(tableHead, "w-[5.25rem] px-1.5")}>Type</th>
                <th className={cn(tableHead, "min-w-[7rem]")}>Name</th>
                <th className={cn(tableHead, "min-w-[8rem]")}>Description</th>
                <th className={cn(tableHead, "w-14 text-center")}>Tax</th>
                <th className={cn(tableHead, "w-[4.5rem] text-right")}>Price</th>
                <th className={cn(tableHead, "w-[4rem] text-right")}>Qty/Hrs</th>
                <th className={cn(tableHead, "w-[4.5rem] text-right")}>Subtotal</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {unifiedRows.map((item) => {
                if (item.kind === "labor") {
                  const l = item.row;
                  const subtotal = laborLineAmountCents(l, laborRateCents);
                  return (
                    <tr
                      key={l.id ?? `labor-${item.index}`}
                      className="group border-b border-border/50 hover:bg-brand-light/[0.04]"
                    >
                      <td className="px-1.5 py-1 align-middle">
                        <TypeBadge kind="labor" />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <ShopLaborPickerInput
                          value={l.name}
                          onChange={(name) =>
                            setForm((f) => ({
                              ...f,
                              labor: f.labor.map((r, j) =>
                                j === item.index ? { ...r, name } : r,
                              ),
                            }))
                          }
                          onPick={(line) =>
                            setForm((f) => ({
                              ...f,
                              labor: f.labor.map((r, j) =>
                                j === item.index
                                  ? { ...r, name: line.description, description: r.description }
                                  : r,
                              ),
                            }))
                          }
                          items={shopLaborItems}
                          placeholder="Labor name"
                          className={cn(cellInput, "pl-7")}
                          aria-label="Labor name"
                        />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <Input
                          value={l.description}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              labor: f.labor.map((r, j) =>
                                j === item.index ? { ...r, description: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Line description"
                          className={cellInput}
                          aria-label="Labor line description"
                        />
                      </td>
                      <td className="py-1 align-middle">
                        <TaxableCell />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <LaborDollarsInput
                          labor={l}
                          laborRateCents={laborRateCents}
                          onCommitFlat={(flatAmountCents) =>
                            setForm((f) => ({
                              ...f,
                              labor: f.labor.map((r, j) =>
                                j === item.index ? { ...r, flatAmountCents } : r,
                              ),
                            }))
                          }
                          placeholder="0.00"
                          className={cellNumeric}
                          aria-label="Labor price"
                        />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <HoursInput
                          hours={l.hours}
                          onCommit={(hours) =>
                            setForm((f) => ({
                              ...f,
                              labor: f.labor.map((r, j) =>
                                j === item.index
                                  ? { ...r, hours, flatAmountCents: null }
                                  : r,
                              ),
                            }))
                          }
                          placeholder="0.0"
                          className={cellNumeric}
                          aria-label="Labor hours"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right align-middle tabular-nums font-semibold text-foreground">
                        {formatCents(subtotal)}
                      </td>
                      <td className="py-1 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 opacity-40 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(item)}
                          aria-label="Remove line"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                }

                if (item.kind === "part") {
                  const p = item.row;
                  const subtotal = p.costCents * p.quantity;
                  return (
                    <tr
                      key={p.id ?? `part-${item.index}`}
                      className="group border-b border-border/50 hover:bg-brand-light/[0.04]"
                    >
                      <td className="px-1.5 py-1 align-middle">
                        <TypeBadge kind="part" />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <Input
                          value={p.description}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              parts: f.parts.map((r, j) =>
                                j === item.index ? { ...r, description: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Part name"
                          className={cellInput}
                          aria-label="Part name"
                        />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <Input
                          value={p.partNumber}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              parts: f.parts.map((r, j) =>
                                j === item.index ? { ...r, partNumber: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Part # or details"
                          className={cellInput}
                          aria-label="Part description or number"
                        />
                      </td>
                      <td className="py-1 align-middle">
                        <TaxableCell />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <DollarsInput
                          cents={p.costCents}
                          onCommit={(costCents) =>
                            setForm((f) => ({
                              ...f,
                              parts: f.parts.map((r, j) =>
                                j === item.index ? { ...r, costCents } : r,
                              ),
                            }))
                          }
                          placeholder="0.00"
                          className={cellNumeric}
                          aria-label="Part price"
                        />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={String(p.quantity)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw !== "" && !/^\d+$/.test(raw)) return;
                            setForm((f) => ({
                              ...f,
                              parts: f.parts.map((r, j) =>
                                j === item.index
                                  ? { ...r, quantity: raw === "" ? 1 : parseInt(raw, 10) || 1 }
                                  : r,
                              ),
                            }));
                          }}
                          onFocus={(e) => e.target.select()}
                          className={cellNumeric}
                          aria-label="Quantity"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right align-middle tabular-nums font-semibold text-foreground">
                        {formatCents(subtotal)}
                      </td>
                      <td className="py-1 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 opacity-40 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(item)}
                          aria-label="Remove line"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                }

                const f = item.row;
                const subtotal = feeLineAmountCents(
                  f,
                  costBasis.laborCostCents,
                  costBasis.partsCostCents,
                );
                return (
                  <tr
                    key={f.id ?? `fee-${item.index}`}
                    className="group border-b border-border/50 hover:bg-brand-red/[0.03]"
                  >
                    <td className="px-1.5 py-1 align-middle">
                      <TypeBadge kind="fee" />
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <div className="relative">
                        <Input
                          value={f.name}
                          list={shopFeeTemplates.length ? `${idPrefix}-fee-templates` : undefined}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              fees: prev.fees.map((r, j) => {
                                if (j !== item.index) return r;
                                const match = shopFeeTemplates.find(
                                  (t) => t.name.toLowerCase() === e.target.value.toLowerCase(),
                                );
                                return match
                                  ? {
                                      ...r,
                                      name: match.name,
                                      method: match.method,
                                      base: match.base,
                                      amount: match.amount,
                                      capCents: match.capCents,
                                      taxable: match.taxable,
                                    }
                                  : { ...r, name: e.target.value };
                              }),
                            }))
                          }
                          placeholder="Fee name"
                          className={cellInput}
                          aria-label="Fee name"
                        />
                        {shopFeeTemplates.length > 0 ? (
                          <datalist id={`${idPrefix}-fee-templates`}>
                            {shopFeeTemplates.map((t) => (
                              <option key={t.name} value={t.name} />
                            ))}
                          </datalist>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <div className="flex min-w-0 items-center gap-1">
                        <select
                          value={f.method}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              fees: prev.fees.map((r, j) =>
                                j === item.index
                                  ? { ...r, method: e.target.value as AdjustMethod }
                                  : r,
                              ),
                            }))
                          }
                          className={cellSelect}
                          aria-label="Fee method"
                        >
                          <option value="FIXED">Fixed $</option>
                          <option value="PERCENT">Percent</option>
                        </select>
                        <select
                          value={f.base}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              fees: prev.fees.map((r, j) =>
                                j === item.index
                                  ? { ...r, base: e.target.value as AdjustBase }
                                  : r,
                              ),
                            }))
                          }
                          className={cellSelect}
                          aria-label="Fee calculate on"
                        >
                          <option value="LABOR">Labor</option>
                          <option value="PARTS">Parts</option>
                          <option value="LABOR_PARTS">Labor + parts</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-1 align-middle">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            fees: prev.fees.map((r, j) =>
                              j === item.index ? { ...r, taxable: !r.taxable } : r,
                            ),
                          }))
                        }
                        className="flex w-full justify-center"
                        aria-label={
                          f.taxable ? "Taxable — click to turn off" : "Not taxable — click to turn on"
                        }
                      >
                        <TaxableCell checked={f.taxable} />
                      </button>
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <div className="relative">
                        <FeeAmountInput
                          fee={f}
                          onCommit={(amount) =>
                            setForm((prev) => ({
                              ...prev,
                              fees: prev.fees.map((r, j) =>
                                j === item.index ? { ...r, amount } : r,
                              ),
                            }))
                          }
                          className={cellNumeric}
                        />
                        {f.method === "PERCENT" ? (
                          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            %
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <span
                        className="block px-1.5 text-right text-[11px] text-muted-foreground"
                        title="Calculate on"
                      >
                        {BASE_LABELS[f.base]}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right align-middle tabular-nums font-semibold text-foreground">
                      {formatCents(subtotal)}
                    </td>
                    <td className="py-1 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 opacity-40 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(item)}
                        aria-label="Remove line"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-muted/[0.06]">
                <td className="px-2 py-2 align-middle">
                  <select
                    value={pendingType}
                    onChange={(e) => {
                      const next = e.target.value as "" | ActiveLineKind;
                      if (next === "labor" || next === "part" || next === "fee") addLine(next);
                      else setPendingType("");
                    }}
                    className={cn(
                      "h-8 w-full cursor-pointer rounded border border-dashed border-brand-navy/25 bg-white px-1",
                      "text-[11px] font-medium text-brand-navy focus-visible:border-brand-navy/50 focus-visible:outline-none",
                    )}
                    aria-label="Add line type"
                  >
                    <option value="">Select*</option>
                    {LINE_OPTIONS.map((opt) =>
                      opt.disabled ? (
                        <option key={opt.value} value="" disabled title={opt.title}>
                          {opt.label} (soon)
                        </option>
                      ) : (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ),
                    )}
                  </select>
                </td>
                <td className="py-2 pr-1 align-middle" colSpan={2}>
                  <div className="flex h-8 items-center gap-1.5 px-1.5 text-[11px] text-muted-foreground">
                    <Plus className="size-3 shrink-0 opacity-60" aria-hidden />
                    {unifiedRows.length === 0
                      ? "Choose a line type above to start building"
                      : "Add another line"}
                  </div>
                </td>
                <td className="py-2 align-middle">
                  <div className="flex justify-center opacity-30">
                    <TaxableCell />
                  </div>
                </td>
                <td className="py-2 pr-1 align-middle">
                  <span className="block px-1.5 text-right text-[11px] tabular-nums text-muted-foreground/50">
                    0.00
                  </span>
                </td>
                <td className="py-2 pr-1 align-middle">
                  <span className="block px-1.5 text-right text-[11px] tabular-nums text-muted-foreground/50">
                    0
                  </span>
                </td>
                <td className="px-2 py-2 text-right align-middle text-[11px] text-muted-foreground/50">
                  —
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Labor uses your shop rate (${(laborRateCents / 100).toFixed(0)}/hr) unless you enter a flat
        price. Fees use fixed $ or % of labor/parts. Retail markup applies when added to an estimate.
      </p>

      <ShopLaborManageDialog
        open={manageLaborOpen}
        onOpenChange={setManageLaborOpen}
        laborRateCents={laborRateCents}
        onChanged={onLaborItemsChanged}
      />
    </div>
  );
}
