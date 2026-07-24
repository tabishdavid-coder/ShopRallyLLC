"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  CircleDollarSign,
  Minus,
  Package,
  PenLine,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";

import {
  CategorySelectField,
  DollarsInput,
  HoursInput,
  LaborDollarsInput,
  discountLineAmountCents,
  emptyPartRow,
  feeLineAmountCents,
  inspectionLineAmountCents,
  laborLineAmountCents,
  type CannedJobFormState,
  type DiscountRow,
  type FeeRow,
  type InspectionRow,
  type LaborRow,
  type PartRow,
} from "@/components/canned-jobs/canned-job-form";
import { InspectionTemplatePickerDialog } from "@/components/canned-jobs/inspection-template-picker-dialog";
import { InventoryPartPickerDialog } from "@/components/canned-jobs/inventory-part-picker-dialog";
import { TireStockPickerDialog } from "@/components/canned-jobs/tire-stock-picker-dialog";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";
import { ShopLaborPickerInput } from "@/components/canned-jobs/shop-labor-picker-input";
import { ShopLaborManageDialog } from "@/components/canned-jobs/shop-labor-manage-dialog";
import {
  amountDisplay,
  parseAmountInput,
  type AdjustBase,
  type AdjustMethod,
} from "@/components/estimate-building/estimate-lab-adjustment-shared";
import type { CannedJobPartLineTypeUi } from "@/lib/canned-job-schemas";
import type { InspectionTemplatePickerRow } from "@/lib/inspection-template-schemas";
import type { ShopFeeTemplateRow } from "@/server/actions/canned-jobs";
import type { InventoryPartRow } from "@/server/inventory";
import type { TireStockRow } from "@/server/tire-stock";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  | { kind: "fee"; index: number; row: FeeRow }
  | { kind: "discount"; index: number; row: DiscountRow }
  | { kind: "inspection"; index: number; row: InspectionRow };

type ActiveLineKind =
  | "labor"
  | "part"
  | "tire"
  | "sublet"
  | "other"
  | "fee"
  | "discount"
  | "inspection";

const LINE_OPTIONS: { value: ActiveLineKind; label: string }[] = [
  { value: "labor", label: "Labor" },
  { value: "part", label: "Part" },
  { value: "fee", label: "Fee" },
  { value: "tire", label: "Tire" },
  { value: "sublet", label: "Sublet" },
  { value: "other", label: "Other" },
  { value: "discount", label: "Discount" },
  { value: "inspection", label: "Inspection" },
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

function TypeBadge({ kind }: { kind: ActiveLineKind | CannedJobPartLineTypeUi }) {
  const config = {
    labor: { Icon: Wrench, label: "Labor", className: "bg-brand-navy/12 text-brand-navy" },
    part: { Icon: Package, label: "Part", className: "bg-brand-light/40 text-brand-navy" },
    tire: { Icon: Circle, label: "Tire", className: "bg-brand-light/50 text-brand-navy" },
    sublet: { Icon: Package, label: "Sublet", className: "bg-slate-200/80 text-slate-700" },
    other: { Icon: Package, label: "Other", className: "bg-slate-100 text-slate-600" },
    fee: { Icon: CircleDollarSign, label: "Fee", className: "bg-brand-red/10 text-brand-red" },
    discount: { Icon: Minus, label: "Discount", className: "bg-brand-red/10 text-brand-red" },
    inspection: { Icon: ShieldCheck, label: "Inspection", className: "bg-brand-navy/10 text-brand-navy" },
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

function isManualPartRow(part: PartRow): boolean {
  return part.lineType === "part" && !part.inventoryPartId;
}

function PartSourceMenu({
  manual,
  onFromInventory,
  onManualPart,
  open,
  onOpenChange,
  ariaLabel = "Part source",
}: {
  manual: boolean;
  onFromInventory: () => void;
  onManualPart: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  ariaLabel?: string;
}) {
  const Icon = manual ? PenLine : Package;
  const label = manual ? "Manual" : "Part";

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full min-h-8 items-center justify-center gap-0.5 rounded-md px-1 py-1.5",
            "text-[11px] font-bold uppercase leading-none tracking-wide",
            "transition-colors hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
            manual ? "bg-slate-100 text-slate-700" : "bg-brand-light/40 text-brand-navy",
          )}
          aria-label={ariaLabel}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span>{label}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem
          onClick={onFromInventory}
          className="gap-2 text-xs"
        >
          <Search className="size-3.5 text-brand-navy" aria-hidden />
          From inventory
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onManualPart}
          className="gap-2 text-xs"
        >
          <PenLine className="size-3.5 text-brand-navy" aria-hidden />
          Manual part
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function partRowFromInventory(part: InventoryPartRow): PartRow {
  return {
    ...emptyPartRow("part"),
    brand: part.brand ?? "",
    description: part.description,
    partNumber: part.partNumber,
    costCents: part.costCents,
    quantity: 1,
    inventoryPartId: part.id,
  };
}

function partRowFromTireStock(tire: TireStockRow): PartRow {
  return {
    ...emptyPartRow("tire"),
    brand: tire.brand,
    description: `${tire.brand} ${tire.model}`.trim(),
    partNumber: tire.stockNumber,
    costCents: tire.costCents,
    quantity: 4,
    tireStockId: tire.id,
  };
}

function inspectionRowFromTemplate(template: InspectionTemplatePickerRow): InspectionRow {
  return {
    name: template.name,
    description: "",
    inspectionTemplateId: template.id,
    hours: 0.75,
    flatAmountCents: null,
  };
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
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [tirePickerOpen, setTirePickerOpen] = useState(false);
  const [inspectionPickerOpen, setInspectionPickerOpen] = useState(false);
  const [partAddMenuOpen, setPartAddMenuOpen] = useState(false);
  const [pickTarget, setPickTarget] = useState<{ kind: "part" | "tire"; index: number } | null>(
    null,
  );
  const [inspectionPickIndex, setInspectionPickIndex] = useState<number | null>(null);

  const costBasis = useMemo(() => {
    const laborCostCents = form.labor.reduce(
      (s, l) => s + laborLineAmountCents(l, laborRateCents),
      0,
    );
    const inspectionCostCents = form.inspections.reduce(
      (s, i) => s + inspectionLineAmountCents(i, laborRateCents),
      0,
    );
    const partsCostCents = form.parts.reduce((s, p) => s + p.costCents * p.quantity, 0);
    return {
      laborCostCents: laborCostCents + inspectionCostCents,
      partsCostCents,
    };
  }, [form.labor, form.inspections, form.parts, laborRateCents]);

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
    const discountRows: UnifiedRow[] = form.discounts.map((row, index) => ({
      kind: "discount" as const,
      index,
      row,
    }));
    const inspectionRows: UnifiedRow[] = form.inspections.map((row, index) => ({
      kind: "inspection" as const,
      index,
      row,
    }));
    return [...laborRows, ...partRows, ...feeRows, ...discountRows, ...inspectionRows];
  }, [form.labor, form.parts, form.fees, form.discounts, form.inspections]);

  const addLabor = () =>
    setForm((f) => ({
      ...f,
      labor: [...f.labor, { name: "", description: "", hours: 0, flatAmountCents: null }],
    }));

  const addPart = (lineType: CannedJobPartLineTypeUi = "part") =>
    setForm((f) => ({
      ...f,
      parts: [...f.parts, emptyPartRow(lineType)],
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

  const addDiscount = () =>
    setForm((f) => ({
      ...f,
      discounts: [
        ...f.discounts,
        {
          name: "",
          method: "FIXED" as AdjustMethod,
          base: "LABOR_PARTS" as AdjustBase,
          amount: 0,
        },
      ],
    }));

  const addInspection = (row?: InspectionRow) =>
    setForm((f) => ({
      ...f,
      inspections: [
        ...f.inspections,
        row ?? {
          name: "",
          description: "",
          inspectionTemplateId: null,
          hours: 0.75,
          flatAmountCents: null,
        },
      ],
    }));

  const handleLineTypeSelect = (kind: ActiveLineKind) => {
    setPickTarget(null);
    if (kind === "labor") addLabor();
    else if (kind === "part") setPartAddMenuOpen(true);
    else if (kind === "tire") setTirePickerOpen(true);
    else if (kind === "sublet") addPart("sublet");
    else if (kind === "other") addPart("other");
    else if (kind === "fee") addFee();
    else if (kind === "discount") addDiscount();
    else if (kind === "inspection") {
      setInspectionPickIndex(null);
      setInspectionPickerOpen(true);
    }
    setPendingType("");
  };

  function applyInventoryPick(part: InventoryPartRow) {
    const row = partRowFromInventory(part);
    setForm((f) => {
      if (pickTarget?.kind === "part") {
        return {
          ...f,
          parts: f.parts.map((r, i) =>
            i === pickTarget.index ? { ...row, id: r.id, lineType: r.lineType } : r,
          ),
        };
      }
      return { ...f, parts: [...f.parts, row] };
    });
    setPickTarget(null);
  }

  function applyTirePick(tire: TireStockRow) {
    const row = partRowFromTireStock(tire);
    setForm((f) => {
      if (pickTarget?.kind === "tire") {
        return {
          ...f,
          parts: f.parts.map((r, i) =>
            i === pickTarget.index ? { ...row, id: r.id, lineType: "tire" as const } : r,
          ),
        };
      }
      return { ...f, parts: [...f.parts, row] };
    });
    setPickTarget(null);
  }

  function applyInspectionPick(template: InspectionTemplatePickerRow) {
    const row = inspectionRowFromTemplate(template);
    if (inspectionPickIndex != null) {
      setForm((f) => ({
        ...f,
        inspections: f.inspections.map((r, i) =>
          i === inspectionPickIndex ? { ...row, id: r.id } : r,
        ),
      }));
      setInspectionPickIndex(null);
      return;
    }
    addInspection(row);
  }

  function openInspectionPickerForRow(index: number) {
    setInspectionPickIndex(index);
    setInspectionPickerOpen(true);
  }

  function openPartPickerForRow(index: number) {
    setPickTarget({ kind: "part", index });
    setPartPickerOpen(true);
  }

  function openPartPickerForNewRow() {
    setPickTarget(null);
    setPartPickerOpen(true);
  }

  function switchPartRowToManual(index: number) {
    setForm((f) => ({
      ...f,
      parts: f.parts.map((r, i) =>
        i === index ? { ...r, inventoryPartId: null } : r,
      ),
    }));
  }

  function addManualPartRow() {
    addPart("part");
    setPartAddMenuOpen(false);
  }

  function openTirePickerForRow(index: number) {
    setPickTarget({ kind: "tire", index });
    setTirePickerOpen(true);
  }

  const removeRow = (item: UnifiedRow) => {
    if (item.kind === "labor") {
      setForm((f) => ({ ...f, labor: f.labor.filter((_, i) => i !== item.index) }));
    } else if (item.kind === "part") {
      setForm((f) => ({ ...f, parts: f.parts.filter((_, i) => i !== item.index) }));
    } else if (item.kind === "fee") {
      setForm((f) => ({ ...f, fees: f.fees.filter((_, i) => i !== item.index) }));
    } else if (item.kind === "discount") {
      setForm((f) => ({ ...f, discounts: f.discounts.filter((_, i) => i !== item.index) }));
    } else {
      setForm((f) => ({ ...f, inspections: f.inspections.filter((_, i) => i !== item.index) }));
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
              Labor catalog
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
                                  ? {
                                      ...r,
                                      name: line.description,
                                      hours: line.hours,
                                      flatAmountCents: line.flatAmountCents,
                                    }
                                  : r,
                              ),
                            }))
                          }
                          items={shopLaborItems}
                          laborRateCents={laborRateCents}
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
                        {p.lineType === "part" ? (
                          <PartSourceMenu
                            manual={isManualPartRow(p)}
                            onFromInventory={() => openPartPickerForRow(item.index)}
                            onManualPart={() => switchPartRowToManual(item.index)}
                            ariaLabel={`Part source for row ${item.index + 1}`}
                          />
                        ) : (
                          <TypeBadge kind={p.lineType} />
                        )}
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <div className="flex min-w-0 items-center gap-1">
                          {p.lineType === "tire" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 shrink-0 text-brand-navy/70 hover:text-brand-navy"
                              onClick={() => openTirePickerForRow(item.index)}
                              title="Pick from tire stock"
                              aria-label="Pick from tire stock"
                            >
                              <Search className="size-3.5" />
                            </Button>
                          ) : null}
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
                            placeholder={
                              p.lineType === "tire"
                                ? "Tire name"
                                : p.lineType === "sublet"
                                  ? "Sublet name"
                                  : p.lineType === "other"
                                    ? "Other item name"
                                    : "Part name"
                            }
                            className={cellInput}
                            aria-label="Line name"
                          />
                        </div>
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

                if (item.kind === "fee") {
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
                }

                if (item.kind === "discount") {
                  const d = item.row;
                  const discountSubtotal = discountLineAmountCents(
                    d,
                    costBasis.laborCostCents,
                    costBasis.partsCostCents,
                  );
                  return (
                    <tr
                      key={d.id ?? `discount-${item.index}`}
                      className="group border-b border-border/50 hover:bg-brand-red/[0.04]"
                    >
                      <td className="px-1.5 py-1 align-middle">
                        <TypeBadge kind="discount" />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <Input
                          value={d.name}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              discounts: prev.discounts.map((r, j) =>
                                j === item.index ? { ...r, name: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Discount name"
                          className={cellInput}
                          aria-label="Discount name"
                        />
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <div className="flex min-w-0 items-center gap-1">
                          <select
                            value={d.method}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                discounts: prev.discounts.map((r, j) =>
                                  j === item.index
                                    ? { ...r, method: e.target.value as AdjustMethod }
                                    : r,
                                ),
                              }))
                            }
                            className={cellSelect}
                            aria-label="Discount method"
                          >
                            <option value="FIXED">Fixed $</option>
                            <option value="PERCENT">Percent</option>
                          </select>
                          <select
                            value={d.base}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                discounts: prev.discounts.map((r, j) =>
                                  j === item.index
                                    ? { ...r, base: e.target.value as AdjustBase }
                                    : r,
                                ),
                              }))
                            }
                            className={cellSelect}
                            aria-label="Discount calculate on"
                          >
                            <option value="LABOR">Labor</option>
                            <option value="PARTS">Parts</option>
                            <option value="LABOR_PARTS">Labor + parts</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-1 align-middle">
                        <div className="flex justify-center opacity-40">
                          <TaxableCell checked={false} />
                        </div>
                      </td>
                      <td className="py-1 pr-1 align-middle">
                        <div className="relative">
                          <FeeAmountInput
                            fee={d}
                            onCommit={(amount) =>
                              setForm((prev) => ({
                                ...prev,
                                discounts: prev.discounts.map((r, j) =>
                                  j === item.index ? { ...r, amount } : r,
                                ),
                              }))
                            }
                            className={cellNumeric}
                          />
                          {d.method === "PERCENT" ? (
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
                          {BASE_LABELS[d.base]}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right align-middle tabular-nums font-semibold text-brand-red">
                        −{formatCents(discountSubtotal)}
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

                const ins = item.row;
                const inspectionSubtotal = inspectionLineAmountCents(ins, laborRateCents);
                return (
                  <tr
                    key={ins.id ?? `inspection-${item.index}`}
                    className="group border-b border-border/50 hover:bg-brand-light/[0.04]"
                  >
                    <td className="px-1.5 py-1 align-middle">
                      <TypeBadge kind="inspection" />
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <div className="flex min-w-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 shrink-0 text-brand-navy/70 hover:text-brand-navy"
                          onClick={() => openInspectionPickerForRow(item.index)}
                          title="Pick inspection template"
                          aria-label="Pick inspection template"
                        >
                          <Search className="size-3.5" />
                        </Button>
                        <Input
                          value={ins.name}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              inspections: f.inspections.map((r, j) =>
                                j === item.index ? { ...r, name: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Inspection name"
                          className={cellInput}
                          aria-label="Inspection name"
                        />
                      </div>
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <Input
                        value={ins.description}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            inspections: f.inspections.map((r, j) =>
                              j === item.index ? { ...r, description: e.target.value } : r,
                            ),
                          }))
                        }
                        placeholder="Notes or checklist detail"
                        className={cellInput}
                        aria-label="Inspection description"
                      />
                    </td>
                    <td className="py-1 align-middle">
                      <TaxableCell />
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <LaborDollarsInput
                        labor={{
                          name: ins.name,
                          description: ins.description,
                          hours: ins.hours,
                          flatAmountCents: ins.flatAmountCents,
                        }}
                        laborRateCents={laborRateCents}
                        onCommitFlat={(flatAmountCents) =>
                          setForm((f) => ({
                            ...f,
                            inspections: f.inspections.map((r, j) =>
                              j === item.index ? { ...r, flatAmountCents } : r,
                            ),
                          }))
                        }
                        placeholder="0.00"
                        className={cellNumeric}
                        aria-label="Inspection price"
                      />
                    </td>
                    <td className="py-1 pr-1 align-middle">
                      <HoursInput
                        hours={ins.hours}
                        onCommit={(hours) =>
                          setForm((f) => ({
                            ...f,
                            inspections: f.inspections.map((r, j) =>
                              j === item.index
                                ? { ...r, hours, flatAmountCents: null }
                                : r,
                            ),
                          }))
                        }
                        placeholder="0.0"
                        className={cellNumeric}
                        aria-label="Inspection hours"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right align-middle tabular-nums font-semibold text-foreground">
                      {formatCents(inspectionSubtotal)}
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
                  {partAddMenuOpen ? (
                    <PartSourceMenu
                      manual={false}
                      open={partAddMenuOpen}
                      onOpenChange={setPartAddMenuOpen}
                      onFromInventory={() => {
                        setPartAddMenuOpen(false);
                        openPartPickerForNewRow();
                      }}
                      onManualPart={addManualPartRow}
                      ariaLabel="Choose how to add a part line"
                    />
                  ) : (
                    <select
                      value={pendingType}
                      onChange={(e) => {
                        const next = e.target.value as "" | ActiveLineKind;
                        if (next) handleLineTypeSelect(next);
                        else setPendingType("");
                      }}
                      className={cn(
                        "h-8 w-full cursor-pointer rounded border border-dashed border-brand-navy/25 bg-white px-1",
                        "text-[11px] font-medium text-brand-navy focus-visible:border-brand-navy/50 focus-visible:outline-none",
                      )}
                      aria-label="Add line type"
                    >
                      <option value="">Select*</option>
                      {LINE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
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
        Labor and inspection use your shop rate (${(laborRateCents / 100).toFixed(0)}/hr) unless you
        enter a flat price. Part lines can be picked from inventory or entered manually; tire lines use
        tire stock. Fees and discounts use fixed $ or % of labor/parts. Retail markup applies when added
        to an estimate.
      </p>

      <InventoryPartPickerDialog
        open={partPickerOpen}
        onOpenChange={(open) => {
          setPartPickerOpen(open);
          if (!open) {
            setPickTarget(null);
            setPartAddMenuOpen(false);
          }
        }}
        onPick={applyInventoryPick}
        onManualEntry={() => {
          setPartPickerOpen(false);
          if (pickTarget?.kind === "part") {
            switchPartRowToManual(pickTarget.index);
          } else {
            addManualPartRow();
          }
          setPickTarget(null);
        }}
      />
      <TireStockPickerDialog
        open={tirePickerOpen}
        onOpenChange={(open) => {
          setTirePickerOpen(open);
          if (!open) setPickTarget(null);
        }}
        onPick={applyTirePick}
      />
      <InspectionTemplatePickerDialog
        open={inspectionPickerOpen}
        onOpenChange={(open) => {
          setInspectionPickerOpen(open);
          if (!open) setInspectionPickIndex(null);
        }}
        onPick={applyInspectionPick}
      />

      <ShopLaborManageDialog
        open={manageLaborOpen}
        onOpenChange={setManageLaborOpen}
        laborRateCents={laborRateCents}
        onChanged={onLaborItemsChanged}
      />
    </div>
  );
}
