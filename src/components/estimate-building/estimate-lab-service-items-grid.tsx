"use client";

import { useEffect, useMemo, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, Search, X } from "lucide-react";

import { TireStockPickerDialog } from "@/components/canned-jobs/tire-stock-picker-dialog";
import { EstimateLabLineAddSplit } from "@/components/estimate-building/estimate-lab-line-add-split";
import {
  EstimateLineTypeMenu,
  SERVICE_LINE_TYPE_OPTIONS,
  type EstimateLineTypeMenuHandlers,
  type InlineLineType,
} from "@/components/estimate-building/estimate-line-type-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { stripVehicleDetailsFromLineText } from "@/lib/labor-guide-helpers";
import { estimatePartRowFromTireStock } from "@/lib/estimate-part-line-helpers";
import {
  laborLineAmount,
  laborLineTotal,
  partLineAmount,
  partLineTotal,
  patchLaborLine,
  patchPartLine,
} from "@/lib/line-calc";
import { type LaborTier, type PartTier } from "@/lib/matrix";
import { applyLaborMatrixRow, applyPartMatrixRow } from "@/lib/line-calc";
import { cn } from "@/lib/utils";
import type { TireStockRow } from "@/server/tire-stock";
import {
  addDiscount,
  addFee,
  deleteDiscount,
  deleteFee,
  updateDiscount,
  updateFee,
} from "@/server/actions/adjustments";
import {
  amountDisplay,
  calcAdjustmentTotal,
  parseAmountInput,
  type AdjustBase,
  type AdjustMethod,
  type AdjustmentLine,
  type AdjustTemplate,
} from "@/components/estimate-building/estimate-lab-adjustment-shared";
import {
  LAB_GRID_BORDER,
  LAB_GRID_CELL_BORDERED,
  LAB_GRID_CELL_END,
  LAB_GRID_NUM_BORDERED,
  LAB_DESCRIPTION_SELECT_CLASS,
  LAB_DESCRIPTION_TEXTAREA_CLASS,
  LAB_INPUT_FLAT,
  LAB_LINE_GRID_BASE,
  LAB_LINE_GRID_HEAD_BASE,
  LAB_LINE_GRID_MIN_W,
  LAB_MONEY_PREFIX,
  LAB_TABLE_HEAD,
} from "@/components/estimate-building/estimate-lab-job-card-shell";
import {
  LabNameDescCells,
  LabNameDescResizeHandle,
  useLabNameDescSplit,
} from "@/components/estimate-building/estimate-lab-name-desc-split";

function LabDescriptionTextarea({
  value = "",
  onChange,
  onBlur,
  placeholder = "Description",
  readOnly,
  disabled,
  className,
}: {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Textarea
      data-lab-description
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      readOnly={readOnly}
      disabled={disabled}
      rows={2}
      placeholder={placeholder}
      className={cn(LAB_DESCRIPTION_TEXTAREA_CLASS, className)}
    />
  );
}

export type { InlineLineType } from "@/components/estimate-building/estimate-line-type-menu";
export { INLINE_LINE_TYPE_OPTIONS } from "@/components/estimate-building/estimate-line-type-menu";

function lineTypeGuideHandlers(
  onLaborLookup?: () => void,
  onPartLookup?: () => void,
  onLaborManual?: () => void,
  onPartManual?: () => void,
  onTireFromStock?: () => void,
  onCustomTire?: () => void,
): EstimateLineTypeMenuHandlers | undefined {
  if (
    !onLaborLookup &&
    !onPartLookup &&
    !onLaborManual &&
    !onPartManual &&
    !onTireFromStock &&
    !onCustomTire
  ) {
    return undefined;
  }
  return {
    onLaborFromGuide: onLaborLookup,
    onPartFromGuide: onPartLookup,
    onCustomLabor: onLaborManual,
    onCustomPart: onPartManual,
    onTireFromStock,
    onCustomTire,
  };
}

type PartFamilyType = Exclude<InlineLineType, "labor" | "fee" | "discount">;

type LaborRow = {
  id?: string;
  description: string;
  hours: number;
  /** Shop cost for this labor line (cents) — independent of customer rate. */
  costCents: number;
  rateCents: number;
  discountCents?: number;
  totalCents?: number;
  lastField?: "hours" | "rate" | "total";
  useLaborMatrix?: boolean;
  technicianId?: string | null;
  authorized?: boolean;
  /** Per-line tax flag; independent of sibling labor rows. */
  taxable?: boolean;
  sortOrder?: number;
};

type PartRow = {
  id?: string;
  brand: string;
  description: string;
  /** Optional notes under the part (newline-joined with description when persisted). */
  details?: string;
  partNumber: string;
  quantity: number;
  costCents: number;
  retailCents: number;
  discountCents?: number;
  totalCents?: number;
  lastField?: "qty" | "cost" | "retail" | "total";
  usePartMatrix?: boolean;
  source?: string;
  authorized?: boolean;
  /** Per-line tax flag; independent of sibling part rows. */
  taxable?: boolean;
  sortOrder?: number;
  lineType?: PartFamilyType;
  inventoryPartId?: string | null;
  tireStockId?: string | null;
};

type FieldDrafts = Record<string, string>;

type MergedItem =
  | { key: string; kind: "labor"; row: LaborRow }
  | { key: string; kind: "part"; row: PartRow; lineType: PartFamilyType }
  | { key: string; kind: "adjustment"; adjKind: "fee" | "discount"; row: AdjustmentLine };

const dollars = (cents: number) => (cents / 100).toFixed(2);

function draftValue(drafts: FieldDrafts, key: string, fallback: string): string {
  return key in drafts ? drafts[key] : fallback;
}

function isDecimalInput(s: string): boolean {
  return /^-?\d*\.?\d*$/.test(s);
}

function parseOptionalFloat(s: string): number | null {
  const t = s.trim();
  if (t === "" || t === "." || t === "-") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalCents(s: string): number | null {
  const n = parseOptionalFloat(s);
  return n === null ? null : Math.round(n * 100);
}

/** Clean labor hours display (e.g. 0.8, 1.5) — avoid float noise / glyph clipping. */
function formatLaborHours(hours: number): string {
  if (!Number.isFinite(hours) || hours === 0) return "";
  return String(parseFloat(hours.toFixed(3)));
}

function itemKey(row: { id?: string }, kind: "labor" | "part", index: number) {
  return row.id ?? `${kind}-row-${index}`;
}

/** LaborLine has one `description` — first line = Name, remainder = Description (Tekmetric split). */
function splitLaborDesc(full: string): { name: string; detail: string } {
  const i = full.indexOf("\n");
  if (i < 0) return { name: full, detail: "" };
  return { name: full.slice(0, i), detail: full.slice(i + 1) };
}

function joinLaborDesc(name: string, detail: string): string {
  const n = name.trimEnd();
  const d = detail.trim();
  if (!d) return n;
  return n ? `${n}\n${d}` : d;
}

/** Live join while typing — do not trim trailing spaces from Name. */
function joinLaborDescLive(name: string, detail: string): string {
  if (!detail) return name;
  return name ? `${name}\n${detail}` : detail;
}

/** Part detail textarea — line 1 = part #, line 2+ = brand / notes (stored in `brand`). */
function formatPartDetail(partNumber: string, brand: string): string {
  const pn = partNumber.trimEnd();
  const br = brand.trimEnd();
  if (!pn && !br) return "";
  if (!br) return pn;
  if (!pn) return br;
  return `${pn}\n${br}`;
}

function parsePartDetail(full: string): { partNumber: string; brand: string } {
  const trimmed = full.trim();
  if (!trimmed) return { partNumber: "", brand: "" };

  const nl = full.indexOf("\n");
  if (nl < 0) {
    const dotSep = full.indexOf(" · ");
    if (dotSep >= 0) {
      return {
        partNumber: full.slice(0, dotSep).trim(),
        brand: full.slice(dotSep + 3).trim(),
      };
    }
    return { partNumber: trimmed, brand: "" };
  }

  const firstLine = full.slice(0, nl);
  const rest = full.slice(nl + 1);
  const dotSep = firstLine.indexOf(" · ");
  if (dotSep >= 0) {
    const pn = firstLine.slice(0, dotSep).trim();
    const brandFromFirst = firstLine.slice(dotSep + 3).trim();
    const brand = [brandFromFirst, rest.trimEnd()].filter(Boolean).join("\n");
    return { partNumber: pn, brand };
  }

  return {
    partNumber: firstLine.trimEnd(),
    brand: rest.trimEnd(),
  };
}

function inlineTypeOf(item: MergedItem): InlineLineType {
  if (item.kind === "labor") return "labor";
  if (item.kind === "adjustment") return item.adjKind;
  return item.lineType;
}

function isPartFamily(type: InlineLineType): type is PartFamilyType {
  return type !== "labor" && type !== "fee" && type !== "discount";
}

function buildMerged(
  labor: LaborRow[],
  parts: PartRow[],
  fees: AdjustmentLine[],
  discounts: AdjustmentLine[],
): MergedItem[] {
  const items: { order: number; item: MergedItem }[] = [];
  labor.forEach((row, i) => {
    items.push({
      order: row.sortOrder ?? i,
      item: { key: itemKey(row, "labor", i), kind: "labor", row },
    });
  });
  parts.forEach((row, i) => {
    items.push({
      order: row.sortOrder ?? labor.length + i,
      item: {
        key: itemKey(row, "part", i),
        kind: "part",
        row,
        lineType: row.lineType ?? "part",
      },
    });
  });
  fees.forEach((row, i) => {
    items.push({
      order: row.sortOrder ?? labor.length + parts.length + i,
      item: { key: `fee-${row.id}`, kind: "adjustment", adjKind: "fee", row },
    });
  });
  discounts.forEach((row, i) => {
    items.push({
      order: row.sortOrder ?? labor.length + parts.length + fees.length + i,
      item: { key: `disc-${row.id}`, kind: "adjustment", adjKind: "discount", row },
    });
  });
  return items.sort((a, b) => a.order - b.order).map((x) => x.item);
}

function splitMerged(merged: MergedItem[]): { labor: LaborRow[]; parts: PartRow[] } {
  const labor: LaborRow[] = [];
  const parts: PartRow[] = [];
  merged.forEach((item, sortOrder) => {
    if (item.kind === "labor") {
      labor.push({ ...item.row, sortOrder });
    } else if (item.kind === "part") {
      parts.push({ ...item.row, lineType: item.lineType, sortOrder });
    }
  });
  return { labor, parts };
}

function newLaborRow(
  baseRateCents: number,
  laborTiers: LaborTier[],
  taxable = true,
): LaborRow {
  const base: LaborRow = {
    description: "",
    hours: 0,
    costCents: 0,
    rateCents: baseRateCents,
    discountCents: 0,
    taxable,
  };
  if (laborTiers.length > 0) {
    return applyLaborMatrixRow({ ...base, useLaborMatrix: true }, baseRateCents, laborTiers);
  }
  return base;
}

function newPartRow(
  partTiers: PartTier[],
  lineType: PartFamilyType = "part",
  taxable = true,
): PartRow {
  const base: PartRow = {
    brand: "",
    description: "",
    partNumber: "",
    quantity: lineType === "tire" ? 4 : 1,
    costCents: 0,
    retailCents: 0,
    discountCents: 0,
    taxable,
    lineType,
    inventoryPartId: null,
    tireStockId: null,
  };
  if (partTiers.length > 0) {
    return { ...applyPartMatrixRow({ ...base, usePartMatrix: true }, partTiers), lineType };
  }
  return base;
}

function laborFromPart(row: PartRow, baseRateCents: number, laborTiers: LaborTier[]): LaborRow {
  const base: LaborRow = {
    description: row.description,
    hours: 1,
    costCents: 0,
    rateCents: baseRateCents,
    discountCents: 0,
    authorized: row.authorized,
    taxable: row.taxable ?? true,
  };
  if (laborTiers.length > 0) {
    return applyLaborMatrixRow({ ...base, useLaborMatrix: true }, baseRateCents, laborTiers);
  }
  return base;
}

function partFromLabor(row: LaborRow, partTiers: PartTier[], lineType: PartFamilyType): PartRow {
  const base: PartRow = {
    brand: "",
    description: row.description,
    partNumber: "",
    quantity: 1,
    costCents: 0,
    retailCents: 0,
    discountCents: 0,
    authorized: row.authorized,
    taxable: row.taxable ?? true,
    lineType,
  };
  if (partTiers.length > 0) {
    return { ...applyPartMatrixRow({ ...base, usePartMatrix: true }, partTiers), lineType };
  }
  return base;
}

/** Shared Service Items numeric rhythm — one size/weight/align for Qty + money columns. */
const NUM_TYPE = "text-[11px] font-medium tabular-nums";
const MONEY_CELL = "flex h-7 w-full min-w-0 items-center overflow-visible";
/** Left `$` — same typeface as amount; slightly softer via opacity so digits stay primary. */
const MONEY_DOLLAR =
  "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[11px] font-medium tabular-nums opacity-70";
const MONEY_AMOUNT_PAD = "pl-3";
const DISCOUNT_PCT =
  "block w-full text-right text-[10px] font-medium leading-none tabular-nums text-muted-foreground/70";
const ADD_ROW_CHIP =
  "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-brand-navy/25 bg-white px-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy hover:bg-brand-light/15";
const MONEY_INPUT = cn(LAB_INPUT_FLAT, NUM_TYPE, "min-w-0 w-full text-right");
const MONEY_INPUT_LOCKED = "cursor-default bg-muted/25 text-foreground/90";
const QTY_INPUT = cn(LAB_INPUT_FLAT, NUM_TYPE, "w-full min-w-0 text-right");
const QTY_READONLY = cn(
  "inline-flex h-7 w-full min-w-0 items-center justify-end overflow-visible",
  NUM_TYPE,
);

function InlineMoneyCell({
  draftKey,
  valueCents,
  fieldDrafts,
  focusFieldDraft,
  setFieldDraft,
  clearFieldDraft,
  onCommitCents,
  readOnly,
  placeholder,
  belowSlot,
}: {
  draftKey: string;
  valueCents: number;
  fieldDrafts: Record<string, string>;
  focusFieldDraft: (key: string, value: string) => void;
  setFieldDraft: (key: string, value: string) => void;
  clearFieldDraft: (key: string) => void;
  onCommitCents: (cents: number) => void;
  readOnly?: boolean;
  placeholder?: string;
  belowSlot?: ReactNode;
}) {
  const locked = readOnly;
  const display = draftValue(fieldDrafts, draftKey, dollars(valueCents));

  return (
    <div
      className={cn(
        MONEY_CELL,
        "text-foreground",
        belowSlot && "h-auto min-h-7 flex-col items-stretch justify-center gap-0.5 py-0.5",
      )}
    >
      <div className="relative w-full min-w-0">
        <span className={MONEY_DOLLAR} aria-hidden>
          $
        </span>
        <Input
          type="text"
          inputMode="decimal"
          readOnly={locked}
          placeholder={placeholder}
          value={locked ? display : display || placeholder || ""}
          onFocus={() => {
            if (locked) return;
            focusFieldDraft(draftKey, dollars(valueCents));
          }}
          onChange={(e) => {
            if (locked) return;
            const v = e.target.value;
            if (!isDecimalInput(v)) return;
            setFieldDraft(draftKey, v);
            const cents = parseOptionalCents(v);
            if (cents !== null) onCommitCents(cents);
          }}
          onBlur={(e) => {
            if (locked) return;
            const cents = parseOptionalCents(e.target.value) ?? 0;
            onCommitCents(cents);
            clearFieldDraft(draftKey);
          }}
          className={cn(
            MONEY_INPUT,
            MONEY_AMOUNT_PAD,
            belowSlot && "h-4 min-h-0",
            locked && MONEY_INPUT_LOCKED,
          )}
        />
      </div>
      {belowSlot}
    </div>
  );
}

function InlinePlaceholderCell({ placeholder = "—" }: { placeholder?: string }) {
  return (
    <div className={MONEY_CELL}>
      <span
        className={cn(
          "inline-flex h-7 w-full items-center justify-end text-muted-foreground/40",
          NUM_TYPE,
        )}
      >
        {placeholder}
      </span>
    </div>
  );
}

function LineDiscountCell({
  editing,
  amountCents,
  discountCents = 0,
  draftKey,
  fieldDrafts,
  focusFieldDraft,
  setFieldDraft,
  clearFieldDraft,
  onCommitCents,
  className,
}: {
  editing: boolean;
  amountCents: number;
  discountCents?: number;
  draftKey?: string;
  fieldDrafts?: FieldDrafts;
  focusFieldDraft?: (key: string, value: string) => void;
  setFieldDraft?: (key: string, value: string) => void;
  clearFieldDraft?: (key: string) => void;
  onCommitCents?: (cents: number) => void;
  className?: string;
}) {
  const pct = amountCents > 0 ? (Math.min(discountCents, amountCents) / amountCents) * 100 : 0;
  const pctLabel = `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;

  if (editing && draftKey && fieldDrafts && focusFieldDraft && setFieldDraft && clearFieldDraft && onCommitCents) {
    return (
      <InlineMoneyCell
        draftKey={draftKey}
        valueCents={discountCents}
        fieldDrafts={fieldDrafts}
        focusFieldDraft={focusFieldDraft}
        setFieldDraft={setFieldDraft}
        clearFieldDraft={clearFieldDraft}
        onCommitCents={(cents) => onCommitCents(Math.min(Math.max(0, cents), amountCents))}
        belowSlot={<span className={DISCOUNT_PCT}>{pctLabel}</span>}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-auto min-h-7 w-full min-w-0 flex-col items-stretch justify-center gap-0.5 py-0.5",
        className,
      )}
    >
      <ReadOnlyMoney cents={discountCents} />
      <span className={DISCOUNT_PCT}>{pctLabel}</span>
    </div>
  );
}

function TaxableCell({
  value,
  editing,
  onChange,
}: {
  value: boolean;
  editing: boolean;
  onChange?: (next: boolean) => void;
}) {
  if (!editing) {
    return <span className={cn(NUM_TYPE, "text-muted-foreground")}>{value ? "Yes" : "No"}</span>;
  }
  return (
    <div className="relative flex w-full min-w-0 items-center justify-center">
      <select
        value={value ? "yes" : "no"}
        onChange={(e) => onChange?.(e.target.value === "yes")}
        className={cn(
          LAB_INPUT_FLAT,
          NUM_TYPE,
          "w-full appearance-none pl-1 pr-3.5 text-center",
        )}
        aria-label="Taxable"
      >
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-0.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60"
      />
    </div>
  );
}

/** Read-only money: same `$` left + amount right rhythm as editable Cost/Price. */
function ReadOnlyMoney({
  cents,
  className,
  prefix = "$",
}: {
  cents: number;
  className?: string;
  /** Currency glyph (use "−$" for credit/discount nets). */
  prefix?: string;
}) {
  const abs = Math.abs(cents);
  return (
    <div className={cn(MONEY_CELL, "text-foreground", className)}>
      <div className="relative w-full min-w-0">
        <span className={MONEY_DOLLAR} aria-hidden>
          {prefix}
        </span>
        <span
          className={cn(
            "inline-flex h-7 w-full min-w-0 items-center justify-end overflow-visible",
            MONEY_AMOUNT_PAD,
            NUM_TYPE,
          )}
        >
          {dollars(abs)}
        </span>
      </div>
    </div>
  );
}

function InlineQtyCell({
  draftKey,
  value,
  fieldDrafts,
  focusFieldDraft,
  setFieldDraft,
  clearFieldDraft,
  onCommit,
  integer,
}: {
  draftKey: string;
  value: string;
  fieldDrafts: Record<string, string>;
  focusFieldDraft: (key: string, value: string) => void;
  setFieldDraft: (key: string, value: string) => void;
  clearFieldDraft: (key: string) => void;
  onCommit: (next: string) => void;
  integer?: boolean;
}) {
  return (
    <Input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      value={draftValue(fieldDrafts, draftKey, value)}
      onFocus={() => focusFieldDraft(draftKey, value)}
      onChange={(e) => {
        const v = e.target.value;
        if (integer ? !/^\d*$/.test(v) : !isDecimalInput(v)) return;
        setFieldDraft(draftKey, v);
        onCommit(v);
      }}
      onBlur={(e) => {
        onCommit(e.target.value);
        clearFieldDraft(draftKey);
      }}
      className={QTY_INPUT}
    />
  );
}

function SortableDragHandle({
  listeners,
  attributes,
  disabled,
  isDragging,
}: {
  listeners?: ReturnType<typeof useSortable>["listeners"];
  attributes?: ReturnType<typeof useSortable>["attributes"];
  disabled?: boolean;
  isDragging?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-6 items-center justify-center rounded outline-none",
        disabled
          ? "cursor-default opacity-30"
          : "cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing",
        isDragging && "opacity-60",
      )}
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-3.5" aria-hidden />
    </button>
  );
}

function SortableRow({
  id,
  children,
  disabled,
  gridTemplateColumns,
}: {
  id: string;
  children: (handle: {
    listeners: ReturnType<typeof useSortable>["listeners"];
    attributes: ReturnType<typeof useSortable>["attributes"];
    isDragging: boolean;
  }) => ReactNode;
  disabled?: boolean;
  gridTemplateColumns: string;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, gridTemplateColumns }}
      className={cn(
        LAB_LINE_GRID_BASE,
        "border-b border-border/60 last:border-0",
        isDragging && "relative z-10 bg-white shadow-md ring-1 ring-brand-navy/20",
      )}
    >
      {children({ listeners, attributes, isDragging })}
    </div>
  );
}

export function EstimateLabServiceItemsGrid({
  labor,
  parts,
  fees = [],
  discounts = [],
  editing,
  baseRateCents,
  laborTiers,
  partTiers,
  fieldDrafts,
  setFieldDraft,
  clearFieldDraft,
  focusFieldDraft,
  onLaborChange,
  onPartsChange,
  onAddLine,
  onLaborManual,
  onLaborLookup,
  onPartManual,
  onPartLookup,
  roId,
  jobId,
  laborCents = 0,
  partsCents = 0,
  feeTemplates = [],
  discountTemplates = [],
  /** Job-level defaults for new lines / fallback when a row has no explicit taxable. */
  laborTaxable = true,
  partsTaxable = true,
}: {
  labor: LaborRow[];
  parts: PartRow[];
  fees?: AdjustmentLine[];
  discounts?: AdjustmentLine[];
  editing: boolean;
  baseRateCents: number;
  laborTiers: LaborTier[];
  partTiers: PartTier[];
  fieldDrafts: FieldDrafts;
  setFieldDraft: (key: string, value: string) => void;
  clearFieldDraft: (key: string) => void;
  focusFieldDraft: (key: string, formatted: string) => void;
  onLaborChange: (rows: LaborRow[]) => void;
  onPartsChange: (rows: PartRow[]) => void;
  onAddLine?: (type: InlineLineType) => void;
  onLaborManual?: () => void;
  onLaborLookup?: () => void;
  onPartManual?: () => void;
  onPartLookup?: () => void;
  roId: string;
  jobId: string;
  laborCents?: number;
  partsCents?: number;
  feeTemplates?: AdjustTemplate[];
  discountTemplates?: AdjustTemplate[];
  laborTaxable?: boolean;
  partsTaxable?: boolean;
}) {
  const router = useRouter();
  const [, startAdj] = useTransition();
  const { ratio, setLive: setNameDescRatio, persist: persistNameDescRatio, gridTemplateColumns } =
    useLabNameDescSplit();
  const calcOpts = { baseRateCents, laborTiers };
  const [addType, setAddType] = useState<InlineLineType>("labor");
  const [dndReady, setDndReady] = useState(false);
  const [tirePickerOpen, setTirePickerOpen] = useState(false);
  const [tirePickTarget, setTirePickTarget] = useState<number | "new" | null>(null);

  useEffect(() => {
    setDndReady(true);
  }, []);

  const merged = useMemo(() => buildMerged(labor, parts, fees, discounts), [labor, parts, fees, discounts]);
  const sortableMerged = useMemo(() => merged.filter((m) => m.kind !== "adjustment"), [merged]);
  const mergedIds = sortableMerged.map((m) => m.key);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function applyMerged(next: MergedItem[]) {
    const split = splitMerged(next);
    onLaborChange(split.labor);
    onPartsChange(split.parts);
  }

  function updateAt(index: number, updater: (item: MergedItem) => MergedItem) {
    applyMerged(merged.map((item, i) => (i === index ? updater(item) : item)));
  }

  function removeAt(index: number) {
    const item = merged[index];
    if (item?.kind === "adjustment") {
      removeAdjustment(item.row.id, item.adjKind);
      return;
    }
    applyMerged(merged.filter((_, i) => i !== index));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableMerged.findIndex((m) => m.key === String(active.id));
    const newIndex = sortableMerged.findIndex((m) => m.key === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sortableMerged, oldIndex, newIndex);
    const adjustments = merged.filter((m) => m.kind === "adjustment");
    applyMerged([...reordered, ...adjustments]);
  }

  function refreshAdjustments() {
    router.refresh();
  }

  function createAdjustment(kind: "fee" | "discount", template?: AdjustTemplate) {
    startAdj(async () => {
      const body = template
        ? {
            name: template.name,
            method: template.method,
            base: template.base,
            amount: template.amount,
            ...(kind === "fee"
              ? { capCents: template.capCents ?? null, taxable: template.taxable ?? false }
              : {}),
          }
        : kind === "fee"
          ? { name: "New fee", method: "FIXED" as AdjustMethod, base: "LABOR_PARTS" as AdjustBase, amount: 0, taxable: false }
          : { name: "New discount", method: "FIXED" as AdjustMethod, base: "LABOR_PARTS" as AdjustBase, amount: 0 };
      const res =
        kind === "fee" ? await addFee(roId, body, jobId) : await addDiscount(roId, body, jobId);
      if (res.ok) refreshAdjustments();
    });
  }

  function commitAdjustment(
    item: AdjustmentLine,
    kind: "fee" | "discount",
    patch: Partial<{
      name: string;
      method: AdjustMethod;
      base: AdjustBase;
      amount: number;
      taxable: boolean;
    }>,
  ) {
    const nextName = (patch.name ?? item.name).trim();
    if (!nextName) return;
    const body =
      kind === "fee"
        ? {
            name: nextName,
            method: patch.method ?? item.method,
            base: patch.base ?? item.base,
            amount: patch.amount ?? item.amount,
            capCents: item.capCents ?? null,
            taxable: patch.taxable ?? item.taxable ?? false,
          }
        : {
            name: nextName,
            method: patch.method ?? item.method,
            base: patch.base ?? item.base,
            amount: patch.amount ?? item.amount,
          };
    startAdj(async () => {
      const res =
        kind === "fee" ? await updateFee(item.id, body) : await updateDiscount(item.id, body);
      if (res.ok) refreshAdjustments();
    });
  }

  function removeAdjustment(id: string, kind: "fee" | "discount") {
    startAdj(async () => {
      const res = kind === "fee" ? await deleteFee(id) : await deleteDiscount(id);
      if (res.ok) refreshAdjustments();
    });
  }

  function swapAdjustmentKind(item: AdjustmentLine, from: "fee" | "discount", to: "fee" | "discount") {
    if (from === to) return;
    startAdj(async () => {
      const del = from === "fee" ? await deleteFee(item.id) : await deleteDiscount(item.id);
      if (!del.ok) return;
      const body =
        to === "fee"
          ? {
              name: item.name,
              method: item.method,
              base: item.base,
              amount: item.amount,
              capCents: item.capCents ?? null,
              taxable: item.taxable ?? false,
            }
          : { name: item.name, method: item.method, base: item.base, amount: item.amount };
      const add = to === "fee" ? await addFee(roId, body, jobId) : await addDiscount(roId, body, jobId);
      if (add.ok) refreshAdjustments();
    });
  }

  function onTypeChange(index: number, nextType: InlineLineType) {
    const item = merged[index];
    if (!item || inlineTypeOf(item) === nextType) return;

    if (nextType === "fee" || nextType === "discount") {
      if (item.kind === "adjustment") {
        swapAdjustmentKind(item.row, item.adjKind, nextType);
        return;
      }
      if (item.kind === "labor") {
        const desc = item.row.description;
        const li = laborIndexInArray(index);
        if (li >= 0) onLaborChange(labor.filter((_, i) => i !== li));
        createAdjustment(nextType, { name: desc || (nextType === "fee" ? "New fee" : "New discount"), method: "FIXED", base: "LABOR_PARTS", amount: 0 });
        return;
      }
      if (item.kind === "part") {
        const desc = item.row.description;
        const pi = partIndexInArray(index);
        if (pi >= 0) onPartsChange(parts.filter((_, i) => i !== pi));
        createAdjustment(nextType, { name: desc || (nextType === "fee" ? "New fee" : "New discount"), method: "FIXED", base: "LABOR_PARTS", amount: 0 });
        return;
      }
    }

    if (item.kind === "adjustment") {
      const desc = item.row.name;
      const kind = item.adjKind;
      removeAdjustment(item.row.id, kind);
      if (nextType === "labor") {
        onLaborChange([
          ...labor,
          laborFromPart(
            {
              brand: "",
              description: desc,
              partNumber: "",
              quantity: 1,
              costCents: 0,
              retailCents: 0,
              taxable: laborTaxable,
            },
            baseRateCents,
            laborTiers,
          ),
        ]);
        return;
      }
      if (isPartFamily(nextType)) {
        onPartsChange([
          ...parts,
          { ...newPartRow(partTiers, nextType, partsTaxable), description: desc },
        ]);
        return;
      }
      return;
    }

    if (nextType === "labor") {
      if (item.kind === "labor") return;
      const nextRow = laborFromPart(item.row, baseRateCents, laborTiers);
      updateAt(index, () => ({ key: `l-${Date.now()}`, kind: "labor", row: nextRow }));
      return;
    }

    if (!isPartFamily(nextType)) return;

    const partType = nextType;
    if (item.kind === "labor") {
      const nextRow = partFromLabor(item.row, partTiers, partType);
      updateAt(index, () => ({
        key: `p-${Date.now()}`,
        kind: "part",
        row: nextRow,
        lineType: partType,
      }));
      return;
    }

    updateAt(index, (m) =>
      m.kind === "part"
        ? {
            ...m,
            lineType: partType,
            row: {
              ...m.row,
              lineType: partType,
              tireStockId: partType === "tire" ? m.row.tireStockId ?? null : null,
              inventoryPartId: partType === "part" ? m.row.inventoryPartId ?? null : null,
            },
          }
        : m,
    );
  }

  function laborIndexInArray(index: number) {
    const item = merged[index];
    if (!item || item.kind !== "labor") return -1;
    return labor.findIndex((l) => l === item.row || (item.row.id && l.id === item.row.id));
  }

  function partIndexInArray(index: number) {
    const item = merged[index];
    if (!item || item.kind !== "part") return -1;
    return parts.findIndex((p) => p === item.row || (item.row.id && p.id === item.row.id));
  }

  const showHeaders = editing || merged.length > 0;
  function addManualTireRow() {
    onAddLine?.("tire");
  }

  function openTirePickerForNewRow() {
    setTirePickTarget("new");
    setTirePickerOpen(true);
  }

  function openTirePickerForPartIndex(partIndex: number) {
    setTirePickTarget(partIndex);
    setTirePickerOpen(true);
  }

  function switchTireRowToManual(partIndex: number) {
    onPartsChange(
      parts.map((p, i) =>
        i === partIndex
          ? { ...p, lineType: "tire", tireStockId: null, inventoryPartId: null }
          : p,
      ),
    );
  }

  function applyTirePick(tire: TireStockRow) {
    const row = estimatePartRowFromTireStock(tire, partTiers, partsTaxable);
    if (tirePickTarget === "new") {
      onPartsChange([...parts, row]);
    } else if (typeof tirePickTarget === "number") {
      onPartsChange(
        parts.map((p, i) =>
          i === tirePickTarget ? { ...row, id: p.id, lineType: "tire" as const } : p,
        ),
      );
    }
    setTirePickTarget(null);
  }

  const typeGuideHandlers = lineTypeGuideHandlers(
    onLaborLookup,
    onPartLookup,
    onLaborManual,
    onPartManual,
    openTirePickerForNewRow,
    addManualTireRow,
  );

  function handlersForRow(item: MergedItem, index: number): EstimateLineTypeMenuHandlers | undefined {
    if (item.kind === "part" && item.lineType === "tire") {
      const pi = partIndexInArray(index);
      if (pi < 0) return typeGuideHandlers;
      return lineTypeGuideHandlers(
        onLaborLookup,
        onPartLookup,
        onLaborManual,
        onPartManual,
        () => openTirePickerForPartIndex(pi),
        () => switchTireRowToManual(pi),
      );
    }
    return typeGuideHandlers;
  }

  function addManualForType(type: InlineLineType) {
    if (type === "labor") {
      onLaborManual?.();
      return;
    }
    if (type === "part") {
      onPartManual?.();
      return;
    }
    if (type === "tire") {
      addManualTireRow();
      return;
    }
    if (type === "fee" || type === "discount") {
      createAdjustment(type);
      return;
    }
    onAddLine?.(type);
  }

  function addLookupForType(type: InlineLineType) {
    if (type === "labor") {
      onLaborLookup?.();
      return;
    }
    if (type === "tire") {
      openTirePickerForNewRow();
      return;
    }
    if (type === "part") {
      onPartLookup?.();
    }
  }

  const addRowHasLookup = addType === "labor" || addType === "part" || addType === "tire";
  const addRowHint =
    addType === "labor"
      ? "Manual order = blank labor row; OEM lookup = OEM Labor Guide (MOTOR fallback)"
      : addType === "tire"
        ? "Manual tire = off-stock entry; Tire stock = pick from shop inventory"
        : addType === "part"
          ? "Manual order = phone/off-catalog line; Lookup = supplier catalog search"
          : addType === "fee" || addType === "discount"
            ? "Add line — pick a saved preset in the row or enter name + amount inline"
            : "Pick type, then add a blank line inline";

  const rows = merged.map((item, index) => {
    const draftPrefix =
      item.kind === "labor"
        ? `l${laborIndexInArray(index)}`
        : item.kind === "part"
          ? `p${partIndexInArray(index)}`
          : `a-${item.row.id}`;
    const lineThrough =
      item.kind !== "adjustment" && item.row.authorized === false && !editing
        ? "text-foreground/45 line-through"
        : undefined;

    if (item.kind === "labor") {
      const l = item.row;
      const { name: rawLaborName, detail: laborDetail } = splitLaborDesc(l.description);
      // Vehicle YMM belongs in the RO header — strip only for read-only display / blur commit.
      const laborNameDisplay = stripVehicleDetailsFromLineText(rawLaborName);
      const amountCents = laborLineAmount(l);
      const netCents = laborLineTotal(l);
      const lineTaxable = l.taxable ?? laborTaxable;

      return (
        <SortableRow key={item.key} id={item.key} disabled={!editing || !dndReady} gridTemplateColumns={gridTemplateColumns}>
          {({ listeners, attributes, isDragging }) => (
            <>
              <div className={cn(LAB_GRID_CELL_BORDERED, "justify-center")}>
                {editing && dndReady ? (
                  <SortableDragHandle listeners={listeners} attributes={attributes} isDragging={isDragging} />
                ) : (
                  <GripVertical className="size-3.5 text-muted-foreground/30" aria-hidden />
                )}
              </div>
              <div className={LAB_GRID_CELL_BORDERED}>
                <EstimateLineTypeMenu
                  value="labor"
                  typeOptions={SERVICE_LINE_TYPE_OPTIONS}
                  editing={editing}
                  onChange={(t) => onTypeChange(index, t)}
                  handlers={typeGuideHandlers}
                />
              </div>
              <LabNameDescCells
                name={
                  editing ? (
                    <LabDescriptionTextarea
                      value={rawLaborName}
                      placeholder="Enter name*"
                      onChange={(e) =>
                        updateAt(index, (m) =>
                          m.kind === "labor"
                            ? {
                                ...m,
                                row: {
                                  ...m.row,
                                  description: joinLaborDescLive(e.target.value, laborDetail),
                                },
                              }
                            : m,
                        )
                      }
                      onBlur={() => {
                        const cleaned = stripVehicleDetailsFromLineText(rawLaborName);
                        if (cleaned === rawLaborName) return;
                        updateAt(index, (m) =>
                          m.kind === "labor"
                            ? {
                                ...m,
                                row: {
                                  ...m.row,
                                  description: joinLaborDesc(cleaned, laborDetail),
                                },
                              }
                            : m,
                        );
                      }}
                    />
                  ) : (
                    <p className={cn("min-w-0 line-clamp-2 text-xs text-brand-navy", lineThrough)}>
                      {laborNameDisplay || "—"}
                    </p>
                  )
                }
                description={
                  editing ? (
                    <LabDescriptionTextarea
                      value={laborDetail}
                      onChange={(e) =>
                        updateAt(index, (m) =>
                          m.kind === "labor"
                            ? {
                                ...m,
                                row: {
                                  ...m.row,
                                  description: joinLaborDescLive(rawLaborName, e.target.value),
                                },
                              }
                            : m,
                        )
                      }
                    />
                  ) : (
                    <p className={cn("line-clamp-2 min-w-0 text-[10px] leading-snug text-muted-foreground", lineThrough)}>
                      {laborDetail || "—"}
                    </p>
                  )
                }
              />
              <div className={LAB_GRID_NUM_BORDERED}>
                {editing ? (
                  <InlineQtyCell
                    draftKey={`${draftPrefix}-hours`}
                    value={formatLaborHours(l.hours)}
                    fieldDrafts={fieldDrafts}
                    focusFieldDraft={focusFieldDraft}
                    setFieldDraft={setFieldDraft}
                    clearFieldDraft={clearFieldDraft}
                    onCommit={(v) => {
                      const n = parseOptionalFloat(v) ?? 0;
                      updateAt(index, (m) =>
                        m.kind === "labor" ? { ...m, row: patchLaborLine(m.row, "hours", n, calcOpts) } : m,
                      );
                    }}
                  />
                ) : (
                  <span className={cn(QTY_READONLY, lineThrough)}>
                    {l.hours ? formatLaborHours(l.hours) : "0"}
                  </span>
                )}
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                {editing ? (
                  <InlineMoneyCell
                    draftKey={`${draftPrefix}-cost`}
                    valueCents={l.costCents}
                    fieldDrafts={fieldDrafts}
                    focusFieldDraft={focusFieldDraft}
                    setFieldDraft={setFieldDraft}
                    clearFieldDraft={clearFieldDraft}
                    onCommitCents={(cents) =>
                      updateAt(index, (m) =>
                        m.kind === "labor" ? { ...m, row: { ...m.row, costCents: cents } } : m,
                      )
                    }
                  />
                ) : (
                  <ReadOnlyMoney cents={l.costCents} className={lineThrough} />
                )}
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                {editing ? (
                  <InlineMoneyCell
                    draftKey={`${draftPrefix}-rate`}
                    valueCents={l.rateCents}
                    fieldDrafts={fieldDrafts}
                    focusFieldDraft={focusFieldDraft}
                    setFieldDraft={setFieldDraft}
                    clearFieldDraft={clearFieldDraft}
                    onCommitCents={(cents) =>
                      updateAt(index, (m) =>
                        m.kind === "labor" ? { ...m, row: patchLaborLine(m.row, "rate", cents, calcOpts) } : m,
                      )
                    }
                  />
                ) : (
                  <ReadOnlyMoney cents={l.rateCents} className={lineThrough} />
                )}
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney cents={amountCents} className={lineThrough} />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <LineDiscountCell
                  editing={editing}
                  amountCents={amountCents}
                  discountCents={l.discountCents ?? 0}
                  draftKey={`${draftPrefix}-discount`}
                  fieldDrafts={fieldDrafts}
                  focusFieldDraft={focusFieldDraft}
                  setFieldDraft={setFieldDraft}
                  clearFieldDraft={clearFieldDraft}
                  onCommitCents={(cents) =>
                    updateAt(index, (m) =>
                      m.kind === "labor" ? { ...m, row: { ...m.row, discountCents: cents } } : m,
                    )
                  }
                  className={lineThrough}
                />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney cents={netCents} className={lineThrough} />
              </div>
              <div className={cn(LAB_GRID_CELL_BORDERED, "justify-center")}>
                <TaxableCell
                  value={lineTaxable}
                  editing={editing}
                  onChange={(v) =>
                    updateAt(index, (m) =>
                      m.kind === "labor" ? { ...m, row: { ...m.row, taxable: v } } : m,
                    )
                  }
                />
              </div>
              <div className={LAB_GRID_CELL_END}>
                {editing ? (
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    aria-label="Remove line"
                    className="flex size-6 items-center justify-center"
                  >
                    <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                ) : null}
              </div>
            </>
          )}
        </SortableRow>
      );
    }

    if (item.kind === "adjustment") {
      const a = item.row;
      const isFee = item.adjKind === "fee";
      const total = calcAdjustmentTotal(a, laborCents, partsCents);
      const amountKey = `${draftPrefix}-amount`;
      const baseLabel =
        a.base === "LABOR_PARTS" ? "Labor + parts" : a.base === "LABOR" ? "Labor" : "Parts";

      return (
        <SortableRow key={item.key} id={item.key} disabled gridTemplateColumns={gridTemplateColumns}>
          {() => (
            <>
              <div className={cn(LAB_GRID_CELL_BORDERED, "justify-center")}>
                <GripVertical className="size-3.5 text-muted-foreground/30" aria-hidden />
              </div>
              <div className={LAB_GRID_CELL_BORDERED}>
                <EstimateLineTypeMenu
                  value={item.adjKind}
                  typeOptions={SERVICE_LINE_TYPE_OPTIONS}
                  editing={editing}
                  onChange={(t) => onTypeChange(index, t)}
                  handlers={typeGuideHandlers}
                />
              </div>
              <LabNameDescCells
                name={
                  editing ? (
                    <Input
                      defaultValue={a.name}
                      key={`${a.id}-${a.name}`}
                      onBlur={(e) => commitAdjustment(a, item.adjKind, { name: e.target.value })}
                      className={cn(LAB_INPUT_FLAT, "w-full")}
                      placeholder={isFee ? "Fee name" : "Discount name"}
                    />
                  ) : (
                    <p className="min-w-0 line-clamp-2 text-xs text-brand-navy">{a.name || "—"}</p>
                  )
                }
                description={
                  editing ? (
                    <select
                      data-lab-description
                      value={a.base}
                      onChange={(e) =>
                        commitAdjustment(a, item.adjKind, { base: e.target.value as AdjustBase })
                      }
                      className={LAB_DESCRIPTION_SELECT_CLASS}
                      aria-label="Calculate on"
                    >
                      <option value="LABOR_PARTS">Labor + parts</option>
                      <option value="LABOR">Labor</option>
                      <option value="PARTS">Parts</option>
                    </select>
                  ) : (
                    <p className="line-clamp-2 min-w-0 text-[10px] leading-snug text-muted-foreground">
                      {baseLabel}
                    </p>
                  )
                }
              />
              <div className={LAB_GRID_NUM_BORDERED}>
                <span className={cn(QTY_READONLY, "text-muted-foreground")}>
                  {a.method === "PERCENT" ? "—" : "1"}
                </span>
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <InlinePlaceholderCell />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                {editing ? (
                  <div className={MONEY_CELL}>
                    <select
                      className={cn(LAB_MONEY_PREFIX, LAB_INPUT_FLAT, NUM_TYPE)}
                      value={a.method}
                      onChange={(e) =>
                        commitAdjustment(a, item.adjKind, { method: e.target.value as AdjustMethod })
                      }
                      aria-label="Fee method"
                    >
                      <option value="FIXED">$</option>
                      <option value="PERCENT">%</option>
                    </select>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={draftValue(fieldDrafts, amountKey, amountDisplay(a))}
                      onFocus={() => focusFieldDraft(amountKey, amountDisplay(a))}
                      onChange={(e) => {
                        if (!isDecimalInput(e.target.value)) return;
                        setFieldDraft(amountKey, e.target.value);
                        const cents = parseAmountInput(e.target.value);
                        if (cents !== null) commitAdjustment(a, item.adjKind, { amount: cents });
                      }}
                      onBlur={(e) => {
                        const cents = parseAmountInput(e.target.value) ?? a.amount;
                        commitAdjustment(a, item.adjKind, { amount: cents });
                        clearFieldDraft(amountKey);
                      }}
                      className={cn(MONEY_INPUT, "min-w-0 flex-1")}
                    />
                  </div>
                ) : a.method === "PERCENT" ? (
                  <span className={cn(QTY_READONLY)}>{a.amount / 100}%</span>
                ) : (
                  <ReadOnlyMoney cents={a.amount} />
                )}
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney cents={total} />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <LineDiscountCell editing={false} amountCents={total} discountCents={0} />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney
                  cents={total}
                  prefix={!isFee && total > 0 ? "−$" : "$"}
                  className={!isFee && total > 0 ? "text-destructive" : undefined}
                />
              </div>
              <div className={cn(LAB_GRID_CELL_BORDERED, "justify-center")}>
                {isFee ? (
                  <TaxableCell
                    value={Boolean(a.taxable)}
                    editing={editing}
                    onChange={(v) => commitAdjustment(a, "fee", { taxable: v })}
                  />
                ) : (
                  <span className={cn(NUM_TYPE, "text-muted-foreground/40")}>—</span>
                )}
              </div>
              <div className={LAB_GRID_CELL_END}>
                {editing ? (
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    aria-label="Remove line"
                    className="flex size-6 items-center justify-center"
                  >
                    <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                ) : null}
              </div>
            </>
          )}
        </SortableRow>
      );
    }

    const p = item.row;
    const partNameDisplay = stripVehicleDetailsFromLineText(p.description);
    const partDetail = formatPartDetail(p.partNumber, p.brand);
    const amountCents = partLineAmount(p);
    const netCents = partLineTotal(p);
    const lineTaxable = p.taxable ?? partsTaxable;
    const partIndex = partIndexInArray(index);
    const rowTypeHandlers = handlersForRow(item, index);

    return (
      <SortableRow key={item.key} id={item.key} disabled={!editing || !dndReady} gridTemplateColumns={gridTemplateColumns}>
        {({ listeners, attributes, isDragging }) => (
          <>
            <div className={cn(LAB_GRID_CELL_BORDERED, "justify-center")}>
              {editing && dndReady ? (
                <SortableDragHandle listeners={listeners} attributes={attributes} isDragging={isDragging} />
              ) : (
                <GripVertical className="size-3.5 text-muted-foreground/30" aria-hidden />
              )}
            </div>
            <div className={LAB_GRID_CELL_BORDERED}>
              <EstimateLineTypeMenu
                value={item.lineType}
                typeOptions={SERVICE_LINE_TYPE_OPTIONS}
                editing={editing}
                onChange={(t) => onTypeChange(index, t)}
                handlers={rowTypeHandlers}
              />
            </div>
            <LabNameDescCells
              name={
                editing ? (
                  <div className="flex min-w-0 items-start gap-1">
                    {item.lineType === "tire" ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (partIndex >= 0) openTirePickerForPartIndex(partIndex);
                        }}
                        title="Pick from tire stock"
                        aria-label="Pick from tire stock"
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-brand-navy/70 hover:bg-brand-light/15 hover:text-brand-navy"
                      >
                        <Search className="size-3.5" />
                      </button>
                    ) : null}
                    <LabDescriptionTextarea
                      value={p.description}
                      placeholder={item.lineType === "tire" ? "Tire name" : "Enter name*"}
                      onChange={(e) =>
                        updateAt(index, (m) =>
                          m.kind === "part"
                            ? { ...m, row: { ...m.row, description: e.target.value } }
                            : m,
                        )
                      }
                      onBlur={() => {
                        const cleaned = stripVehicleDetailsFromLineText(p.description);
                        if (cleaned === p.description) return;
                        updateAt(index, (m) =>
                          m.kind === "part" ? { ...m, row: { ...m.row, description: cleaned } } : m,
                        );
                      }}
                      className="min-w-0 flex-1"
                    />
                  </div>
                ) : (
                  <p className={cn("min-w-0 line-clamp-2 text-xs", lineThrough)}>
                    {partNameDisplay || "—"}
                    {item.lineType === "tire" && p.tireStockId ? (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">· Stock</span>
                    ) : null}
                  </p>
                )
              }
              description={
                editing ? (
                  <LabDescriptionTextarea
                    value={partDetail}
                    placeholder="Part # · brand"
                    onChange={(e) => {
                      const { partNumber, brand } = parsePartDetail(e.target.value);
                      updateAt(index, (m) =>
                        m.kind === "part" ? { ...m, row: { ...m.row, partNumber, brand } } : m,
                      );
                    }}
                  />
                ) : (
                  <p className={cn("line-clamp-2 min-w-0 text-[10px] leading-snug text-muted-foreground", lineThrough)}>
                    {partDetail || "—"}
                  </p>
                )
              }
            />
            <div className={LAB_GRID_NUM_BORDERED}>
              {editing ? (
                <InlineQtyCell
                  draftKey={`${draftPrefix}-qty`}
                  value={p.quantity ? String(p.quantity) : ""}
                  fieldDrafts={fieldDrafts}
                  focusFieldDraft={focusFieldDraft}
                  setFieldDraft={setFieldDraft}
                  clearFieldDraft={clearFieldDraft}
                  integer
                  onCommit={(v) => {
                    const n = v === "" ? 0 : parseInt(v, 10) || 0;
                    updateAt(index, (m) =>
                      m.kind === "part" ? { ...m, row: patchPartLine(m.row, "qty", n, partTiers) } : m,
                    );
                  }}
                />
              ) : (
                <span className={cn(QTY_READONLY, lineThrough)}>{p.quantity}</span>
              )}
            </div>
            <div className={LAB_GRID_NUM_BORDERED}>
              {editing ? (
                <InlineMoneyCell
                  draftKey={`${draftPrefix}-cost`}
                  valueCents={p.costCents}
                  fieldDrafts={fieldDrafts}
                  focusFieldDraft={focusFieldDraft}
                  setFieldDraft={setFieldDraft}
                  clearFieldDraft={clearFieldDraft}
                  onCommitCents={(cents) =>
                    updateAt(index, (m) =>
                      m.kind === "part" ? { ...m, row: patchPartLine(m.row, "cost", cents, partTiers) } : m,
                    )
                  }
                />
              ) : (
                <ReadOnlyMoney cents={p.costCents} className={lineThrough} />
              )}
            </div>
            <div className={LAB_GRID_NUM_BORDERED}>
              {editing ? (
                <InlineMoneyCell
                  draftKey={`${draftPrefix}-retail`}
                  valueCents={p.retailCents}
                  fieldDrafts={fieldDrafts}
                  focusFieldDraft={focusFieldDraft}
                  setFieldDraft={setFieldDraft}
                  clearFieldDraft={clearFieldDraft}
                  onCommitCents={(cents) =>
                    updateAt(index, (m) =>
                      m.kind === "part" ? { ...m, row: patchPartLine(m.row, "retail", cents, partTiers) } : m,
                    )
                  }
                />
              ) : (
                <ReadOnlyMoney cents={p.retailCents} className={lineThrough} />
              )}
            </div>
            <div className={LAB_GRID_NUM_BORDERED}>
              <ReadOnlyMoney cents={amountCents} className={lineThrough} />
            </div>
            <div className={LAB_GRID_NUM_BORDERED}>
              <LineDiscountCell
                editing={editing}
                amountCents={amountCents}
                discountCents={p.discountCents ?? 0}
                draftKey={`${draftPrefix}-discount`}
                fieldDrafts={fieldDrafts}
                focusFieldDraft={focusFieldDraft}
                setFieldDraft={setFieldDraft}
                clearFieldDraft={clearFieldDraft}
                onCommitCents={(cents) =>
                  updateAt(index, (m) =>
                    m.kind === "part" ? { ...m, row: { ...m.row, discountCents: cents } } : m,
                  )
                }
                className={lineThrough}
              />
            </div>
            <div className={LAB_GRID_NUM_BORDERED}>
              <ReadOnlyMoney cents={netCents} className={lineThrough} />
            </div>
            <div className={cn(LAB_GRID_CELL_BORDERED, "justify-center")}>
              <TaxableCell
                value={lineTaxable}
                editing={editing}
                onChange={(v) =>
                  updateAt(index, (m) =>
                    m.kind === "part" ? { ...m, row: { ...m.row, taxable: v } } : m,
                  )
                }
              />
            </div>
            <div className={LAB_GRID_CELL_END}>
              {editing ? (
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label="Remove line"
                  className="flex size-6 items-center justify-center"
                >
                  <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              ) : null}
            </div>
          </>
        )}
      </SortableRow>
    );
  });

  const listBody =
    merged.length === 0 && !editing ? (
      <div className="px-3 py-2 text-xs text-muted-foreground">No service lines on this job.</div>
    ) : dndReady ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={mergedIds} strategy={verticalListSortingStrategy}>
          {rows}
        </SortableContext>
      </DndContext>
    ) : (
      rows
    );

  return (
    <div className="border-t border-border/70">
      <div className="overflow-x-auto">
        <div className={LAB_LINE_GRID_MIN_W}>
          {showHeaders ? (
            <div
              data-lab-name-desc-header
              style={{ gridTemplateColumns }}
              className={cn(LAB_TABLE_HEAD, LAB_LINE_GRID_HEAD_BASE, "sticky top-0 z-[1] border-b py-0.5")}
            >
              <span className={cn(LAB_GRID_BORDER, "min-h-7")} />
              <span className={cn(LAB_GRID_BORDER, "px-1 text-left")}>Type</span>
              <span className={cn(LAB_GRID_BORDER, "relative px-1 text-left")}>
                Name
                <LabNameDescResizeHandle
                  ratio={ratio}
                  onRatioChange={setNameDescRatio}
                  onRatioCommit={persistNameDescRatio}
                />
              </span>
              <span className={cn(LAB_GRID_BORDER, "px-1 text-left")}>Description</span>
              <span className={cn(LAB_GRID_BORDER, "px-1.5 text-right")}>Qty / Hrs</span>
              <span className={cn(LAB_GRID_BORDER, "px-1.5 text-right")}>Cost</span>
              <span className={cn(LAB_GRID_BORDER, "px-1.5 text-right")}>Price</span>
              <span className={cn(LAB_GRID_BORDER, "px-1.5 text-right")}>Amount</span>
              <span className={cn(LAB_GRID_BORDER, "px-1.5 text-right")}>Discount</span>
              <span className={cn(LAB_GRID_BORDER, "px-1.5 text-right")}>Net Amount</span>
              <span className={cn(LAB_GRID_BORDER, "px-1 text-center")}>Taxable</span>
              <span className="min-h-7" />
            </div>
          ) : null}

          {listBody}

          {editing && (onAddLine || onLaborManual || onLaborLookup || onPartManual || onPartLookup || roId) ? (
            <div
              style={{ gridTemplateColumns }}
              className={cn(LAB_LINE_GRID_BASE, "border-t border-dashed border-border/70 bg-muted/10")}
            >
              <span className={cn(LAB_GRID_BORDER, "min-h-7")} />
              <div className={LAB_GRID_CELL_BORDERED}>
                <EstimateLineTypeMenu
                  value={addType}
                  typeOptions={SERVICE_LINE_TYPE_OPTIONS}
                  editing
                  onChange={setAddType}
                  handlers={typeGuideHandlers}
                />
              </div>
              <div className={LAB_GRID_CELL_BORDERED}>
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  {addRowHasLookup ? (
                    <EstimateLabLineAddSplit
                      kind={addType === "labor" ? "labor" : addType === "tire" ? "tire" : "part"}
                      onManual={() => addManualForType(addType)}
                      onLookup={() => addLookupForType(addType)}
                    />
                  ) : (
                    <button type="button" onClick={() => addManualForType(addType)} className={ADD_ROW_CHIP}>
                      <Plus className="size-3" aria-hidden />
                      Add line
                    </button>
                  )}
                  <span className="text-[10px] text-muted-foreground">{addRowHint}</span>
                </div>
              </div>
              <div className={LAB_GRID_CELL_BORDERED}>
                <LabDescriptionTextarea
                  disabled
                  readOnly
                  placeholder={
                    addType === "part" || addType === "tire" ? "Part # · brand" : "Description"
                  }
                />
              </div>
              <span className={cn(LAB_GRID_NUM_BORDERED, NUM_TYPE, "justify-end text-muted-foreground/40")}>—</span>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney cents={0} className="text-muted-foreground/40" />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney cents={0} className="text-muted-foreground/40" />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney cents={0} className="text-muted-foreground/40" />
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <div className="flex h-auto min-h-7 w-full flex-col items-stretch justify-center gap-0.5 py-0.5 text-muted-foreground/40">
                  <ReadOnlyMoney cents={0} className="text-muted-foreground/40" />
                  <span className={DISCOUNT_PCT}>0%</span>
                </div>
              </div>
              <div className={LAB_GRID_NUM_BORDERED}>
                <ReadOnlyMoney cents={0} className="text-muted-foreground/40" />
              </div>
              <span className={cn(LAB_GRID_CELL_BORDERED, "justify-center", NUM_TYPE, "text-muted-foreground/40")}>
                —
              </span>
              <span className="min-h-7" />
            </div>
          ) : null}
        </div>
      </div>

      <TireStockPickerDialog
        open={tirePickerOpen}
        onOpenChange={(open) => {
          setTirePickerOpen(open);
          if (!open) setTirePickTarget(null);
        }}
        onPick={applyTirePick}
      />
    </div>
  );
}
