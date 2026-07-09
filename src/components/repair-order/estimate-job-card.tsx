"use client";

import { useState, useTransition, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  X,
  Loader2,
  Lock,
  Wand2,
  CheckCircle2,
  Info,
  ListTree,
  Wrench,
  FolderPlus,
  MoreVertical,
  Save,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ApprovalSignatureBadge,
  type ApprovalSignatureInfo,
} from "@/components/repair-order/approval-signature-panel";
import { formatCents } from "@/lib/format";
import { jobAuthState } from "@/lib/ro-totals";
import {
  laborLineTotal,
  partLineTotal,
  patchLaborLine,
  patchPartLine,
  applyLaborMatrixRow,
  applyPartMatrixRow,
  inferLaborMatrixMode,
  inferPartMatrixMode,
  isLaborMatrixApplied,
  isPartMatrixApplied,
} from "@/lib/line-calc";
import {
  laborMatrixTooltip,
  partMatrixTooltip,
  type PartTier,
  type LaborTier,
} from "@/lib/matrix";
import type { JobEditDraft } from "@/components/repair-order/estimate-selection-context";
import { cn } from "@/lib/utils";
import { saveJob, deleteJob, setJobTax, assignJobTechnician } from "@/server/actions/estimate";
import type { DraggableAttributes } from "@dnd-kit/core";
import { SaveAsCannedJobDialog } from "@/components/canned-jobs/save-as-canned-job-dialog";
import { addDiscount, addFee } from "@/server/actions/adjustments";
import type { Technician } from "@/server/staff";
import type { RepairOrderDetail } from "@/server/repair-order";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { EstimateLabJobMenu } from "@/components/estimate-building/estimate-lab-job-menu";
import { EstimateLabJobNotes } from "@/components/estimate-building/estimate-lab-job-notes";
import {
  EstimateLabJobCardShell,
  EstimateLabSaveStatus,
  EstimateLabServiceItemsHeader,
  LAB_CELL,
  LAB_INPUT,
  LAB_TABLE_HEAD,
} from "@/components/estimate-building/estimate-lab-job-card-shell";
import { EstimateLabServiceItemsGrid } from "@/components/estimate-building/estimate-lab-service-items-grid";
import type { AdjustTemplate } from "@/components/estimate-building/estimate-lab-adjustment-shared";
import { useEstimateLabLaborOptional } from "@/components/estimate-building/estimate-lab-labor-provider";
import type { InlineLineType } from "@/components/estimate-building/estimate-lab-service-items-grid";
import {
  EstimateLineTypeMenu,
  PART_FAMILY_LINE_TYPES,
} from "@/components/estimate-building/estimate-line-type-menu";

type Job = RepairOrderDetail["jobs"][number];
type JobAdj = {
  id: string;
  name: string;
  method: "PERCENT" | "FIXED";
  base: "LABOR" | "PARTS" | "LABOR_PARTS";
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
};

function adjVal(a: JobAdj, labor: number, parts: number): number {
  const b = a.base === "LABOR" ? labor : a.base === "PARTS" ? parts : labor + parts;
  let v = a.method === "PERCENT" ? Math.round((b * a.amount) / 10000) : a.amount;
  if (a.capCents != null) v = Math.min(v, a.capCents);
  return Math.max(0, v);
}

type LaborRow = {
  id?: string;
  description: string;
  hours: number;
  /** Shop cost for this labor line (cents) — independent of customer rate. */
  costCents: number;
  rateCents: number;
  totalCents?: number;
  lastField?: "hours" | "rate" | "total";
  useLaborMatrix?: boolean;
  technicianId?: string | null;
  authorized?: boolean;
  sortOrder?: number;
};

/** Display labor hours as a clean decimal (e.g. 0.8, 1.5) — avoid float noise / clipping. */
function formatLaborHours(hours: number): string {
  if (!Number.isFinite(hours) || hours === 0) return "";
  return String(parseFloat(hours.toFixed(3)));
}
type PartFamilyType = Exclude<InlineLineType, "labor" | "fee" | "discount">;

type PartRow = {
  id?: string;
  brand: string;
  description: string;
  /** Extra notes under the part — stored as description line 2+ (no PartLine.details column). */
  details: string;
  partNumber: string;
  quantity: number;
  costCents: number;
  retailCents: number;
  totalCents?: number;
  lastField?: "qty" | "cost" | "retail" | "total";
  usePartMatrix?: boolean;
  source?: string;
  authorized?: boolean;
  sortOrder?: number;
  /** Inline type picker — Part, Tire, Sublet, Hazardous, Other (UI until persisted). */
  lineType?: "part" | "tire" | "sublet" | "hazardous" | "other";
};

/** Split persisted description into name + additional details (newline-separated). */
function splitPartDesc(full: string): { description: string; details: string } {
  const i = full.indexOf("\n");
  if (i < 0) return { description: full, details: "" };
  return { description: full.slice(0, i), details: full.slice(i + 1) };
}

function joinPartDesc(description: string, details: string): string {
  const d = description.trimEnd();
  const extra = details.trim();
  if (!extra) return d;
  return d ? `${d}\n${extra}` : extra;
}

const TEKMETRIC_PART_TYPES: PartFamilyType[] = PART_FAMILY_LINE_TYPES.filter(
  (t): t is PartFamilyType => t !== "other",
);

function isPartFamilyType(type: InlineLineType): type is PartFamilyType {
  return type !== "labor" && type !== "fee" && type !== "discount";
}

/** Lab job-card line actions — navy outline (industry-standard, ShopRally palette). */
const LAB_LINE_ACTION =
  "h-8 gap-1 border-2 border-brand-navy/35 bg-white px-2.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy shadow-none hover:bg-brand-light/15";

/**
 * Shared Labor / Parts numeric column widths so Hours↔Qty, Rate↔Retail, Total↔Total
 * (and remove) align vertically. Parts has Cost; Labor uses an empty spacer of the same width.
 */
const COL_GRIP = "w-8";
/** Wide enough for Labor Book / Part triggers (icon + label + chevron) without clipping. */
const COL_TYPE = "w-[9rem]";
/** Hours / Qty — wide enough for decimals like 0.80 without clipping. */
const COL_QTY = "w-[4.5rem]";
const COL_COST = "w-28";
const COL_RATE = "w-28";
const COL_TOTAL = "w-28";
/** Shared Labor/Parts remove column — fixed width so X buttons stack vertically. */
const COL_REMOVE = "w-8";
const REMOVE_CELL = cn(COL_REMOVE, "px-1 text-center align-middle");

function MatrixStatusPill({
  label,
  tooltip,
  onToggleOff,
  viewOnly,
  compact,
}: {
  label: string;
  tooltip: string;
  onToggleOff?: () => void;
  viewOnly?: boolean;
  compact?: boolean;
}) {
  const interactive = !viewOnly && !!onToggleOff;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md bg-brand-navy/10 font-semibold text-brand-navy ring-2 ring-brand-navy/35",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
      )}
      role="status"
      aria-label={`${label} — matrix pricing on`}
    >
      <Checkbox
        checked
        disabled={!interactive}
        onCheckedChange={(v) => {
          if (v === false) onToggleOff?.();
        }}
        aria-label={interactive ? "Turn off matrix pricing" : "Matrix pricing active"}
        title={interactive ? "Uncheck to switch to manual pricing" : undefined}
        className={cn(
          "shrink-0 border-brand-navy/50 data-[state=checked]:border-brand-navy data-[state=checked]:bg-brand-navy data-[state=checked]:text-white",
          interactive && "cursor-pointer",
          compact ? "size-3" : "size-3.5",
        )}
      />
      <span className="truncate">{label}</span>
      <button
        type="button"
        className="inline-flex shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/50"
        aria-label={tooltip}
        title={tooltip}
      >
        <Info className={cn("shrink-0 text-brand-navy/65", compact ? "size-3" : "size-3.5")} aria-hidden />
      </button>
    </span>
  );
}

function TotalBox({
  label,
  value,
  bold,
  icon,
  checkbox,
}: {
  label: string;
  value: string;
  bold?: boolean;
  icon?: ReactNode;
  checkbox?: ReactNode;
}) {
  return (
    <div className="flex min-w-[7.5rem] flex-col justify-center px-4 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {checkbox}
        {label}
      </div>
      <div className={`mt-0.5 tabular-nums ${bold ? "text-base font-bold text-foreground" : "text-sm font-semibold text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function newLaborRow(baseRateCents: number, laborTiers: LaborTier[]): LaborRow {
  const base: LaborRow = {
    description: "",
    hours: 0,
    costCents: 0,
    rateCents: baseRateCents,
  };
  if (laborTiers.length > 0) {
    return applyLaborMatrixRow({ ...base, useLaborMatrix: true }, baseRateCents, laborTiers);
  }
  return base;
}

function newPartRow(partTiers: PartTier[]): PartRow {
  const base: PartRow = {
    brand: "",
    description: "",
    details: "",
    partNumber: "",
    quantity: 1,
    costCents: 0,
    retailCents: 0,
  };
  if (partTiers.length > 0) {
    return applyPartMatrixRow({ ...base, usePartMatrix: true }, partTiers);
  }
  return base;
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

type FieldDrafts = Record<string, string>;

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

function totals(labor: LaborRow[], parts: PartRow[], taxBps: number) {
  const activeLabor = labor.filter((l) => l.authorized !== false);
  const activeParts = parts.filter((p) => p.authorized !== false);
  const laborTotal = activeLabor.reduce((s, l) => s + laborLineTotal(l), 0);
  const partsTotal = activeParts.reduce((s, p) => s + partLineTotal(p), 0);
  const laborCost = activeLabor.reduce((s, l) => s + l.costCents, 0);
  const partsCost = activeParts.reduce((s, p) => s + p.costCents * p.quantity, 0);
  const subtotal = laborTotal + partsTotal;
  const laborTax = Math.round((laborTotal * taxBps) / 10000);
  const partsTax = Math.round((partsTotal * taxBps) / 10000);
  const gp = laborTotal - laborCost + (partsTotal - partsCost);
  const hours = activeLabor.reduce((s, l) => s + l.hours, 0);
  return {
    laborTotal,
    partsTotal,
    subtotal,
    laborTax,
    partsTax,
    jobTotal: subtotal + laborTax + partsTax,
    gp,
    gpPct: subtotal > 0 ? (gp / subtotal) * 100 : 0,
    gpHr: hours > 0 ? gp / hours : 0,
  };
}

export function EstimateJobCard({
  index,
  job,
  canEdit,
  taxBps,
  partTiers = [],
  laborTiers = [],
  baseRateCents = 0,
  gpGoalCents,
  technicians = [],
  roId,
  customerApproved = false,
  approvalSignature = null,
  jobFees = [],
  jobDiscounts = [],
  feeTemplates = [],
  discountTemplates = [],
  onToggleJob,
  onToggleLabor,
  onTogglePart,
  forceCollapsed,
  expandToken,
  onDraftChange,
  cannedJobCategories = [],
  variant = "default",
  onOpenParts,
  jobDragHandle,
}: {
  index: number;
  job: Job;
  canEdit: boolean;
  taxBps: number;
  partTiers?: PartTier[];
  laborTiers?: LaborTier[];
  baseRateCents?: number;
  gpGoalCents?: number | null;
  technicians?: Technician[];
  roId: string;
  customerApproved?: boolean;
  /** When set, Approved badge opens signature / terms details. */
  approvalSignature?: ApprovalSignatureInfo | null;
  jobFees?: JobAdj[];
  jobDiscounts?: JobAdj[];
  feeTemplates?: AdjustTemplate[];
  discountTemplates?: AdjustTemplate[];
  onToggleJob?: (authorized: boolean) => void;
  onToggleLabor?: (lineId: string, authorized: boolean) => void;
  onTogglePart?: (lineId: string, authorized: boolean) => void;
  forceCollapsed?: boolean;
  expandToken?: number;
  onDraftChange?: (jobId: string, draft: JobEditDraft | null) => void;
  cannedJobCategories?: string[];
  variant?: "default" | "lab";
  /** Lab — open parts panel (manual entry vs supplier lookup). */
  onOpenParts?: (mode: "manual" | "lookup") => void;
  /** Lab — drag handle props from parent sortable wrapper. */
  jobDragHandle?: {
    listeners?: Record<string, Function>;
    attributes?: DraggableAttributes;
    isDragging?: boolean;
  };
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const laborGuide = useEstimateLabLaborOptional();
  const [quickPending, startQuick] = useTransition();

  function toggleTax(patch: { laborTaxable?: boolean; partsTaxable?: boolean }) {
    startQuick(async () => {
      await setJobTax(job.id, patch);
      router.refresh();
    });
  }
  function assignJobTech(technicianId: string | null) {
    startQuick(async () => {
      await assignJobTechnician(job.id, technicianId);
      router.refresh();
    });
  }
  const [collapsed, setCollapsed] = useState(false);
  /** Lab: open in builder mode by default — no pencil-first step (AutoLeap-style). */
  const [editing, setEditing] = useState(variant === "lab" && canEdit);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveCannedOpen, setSaveCannedOpen] = useState(false);
  const [, startAdj] = useTransition();
  const [labSaveState, setLabSaveState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const labAutoSaveSkip = useRef(true);

  const isLab = variant === "lab";

  function renderApprovedBadge(extraClassName?: string) {
    if (!customerApproved) return null;
    if (approvalSignature) {
      return <ApprovalSignatureBadge info={approvalSignature} className={extraClassName} />;
    }
    return (
      <Badge
        className={cn(
          "gap-1 bg-emerald-600 text-[10px] text-white hover:bg-emerald-600",
          extraClassName,
        )}
      >
        <CheckCircle2 className="size-3" /> Approved
      </Badge>
    );
  }

  /** Tekmetric tables — stronger dividers so each job card reads clearly on slate canvas. */
  const jobEdge = isLab ? "border-slate-300" : "border-slate-400/75";
  const jobDivider = isLab ? "border-border/70" : "border-slate-300";
  const jobRowDivider = isLab ? "border-border/80" : "border-slate-200";
  const tableHeadClass = isLab
    ? LAB_TABLE_HEAD
    : "border-b border-slate-300 bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground";
  const cellPad = isLab ? LAB_CELL : "px-3 py-2";
  const cellPadSm = isLab ? LAB_CELL : "px-3 py-1.5";
  const inputH = isLab ? LAB_INPUT : "h-8";

  const initialLabor: LaborRow[] = job.laborLines.map((l, i) => ({
    id: l.id,
    description: l.description,
    hours: l.hours,
    costCents: "costCents" in l && typeof l.costCents === "number" ? l.costCents : 0,
    rateCents: l.rateCents,
    authorized: l.authorized,
    technicianId: l.technicianId,
    sortOrder: l.sortOrder ?? i,
    useLaborMatrix: inferLaborMatrixMode(
      { hours: l.hours, rateCents: l.rateCents },
      baseRateCents,
      laborTiers,
    ),
  }));
  const initialParts: PartRow[] = job.partLines.map((p, i) => {
    const { description, details } = splitPartDesc(p.description);
    return {
      id: p.id,
      brand: p.brand ?? "",
      description,
      details,
      partNumber: p.partNumber ?? "",
      quantity: p.quantity,
      costCents: p.costCents,
      retailCents: p.retailCents,
      source: p.source,
      authorized: p.authorized,
      sortOrder: p.sortOrder ?? i + initialLabor.length,
      lineType: "part",
      usePartMatrix: inferPartMatrixMode(
        { costCents: p.costCents, retailCents: p.retailCents },
        partTiers,
      ),
    };
  });

  const [name, setName] = useState(job.name);
  const [note, setNote] = useState(job.note ?? "");
  const [labor, setLabor] = useState<LaborRow[]>(initialLabor);
  const [parts, setParts] = useState<PartRow[]>(initialParts);
  const [fieldDrafts, setFieldDrafts] = useState<FieldDrafts>({});

  function setFieldDraft(key: string, value: string) {
    setFieldDrafts((d) => ({ ...d, [key]: value }));
  }

  function clearFieldDraft(key: string) {
    setFieldDrafts((d) => {
      if (!(key in d)) return d;
      const { [key]: _, ...rest } = d;
      return rest;
    });
  }

  function focusFieldDraft(key: string, formatted: string) {
    setFieldDrafts((d) => (key in d ? d : { ...d, [key]: formatted }));
  }

  useEffect(() => {
    if (forceCollapsed) setCollapsed(true);
  }, [forceCollapsed]);

  useEffect(() => {
    if (expandToken) setCollapsed(false);
  }, [expandToken]);

  useEffect(() => {
    if (!onDraftChange) return;
    if (editing) {
      onDraftChange(job.id, {
        laborLines: labor.map((l) => ({
          id: l.id,
          hours: l.hours,
          costCents: l.costCents,
          rateCents: l.rateCents,
          totalCents: l.totalCents,
          lastField: l.lastField,
          authorized: l.authorized,
        })),
        partLines: parts.map((p) => ({
          id: p.id,
          quantity: p.quantity,
          retailCents: p.retailCents,
          costCents: p.costCents,
          totalCents: p.totalCents,
          lastField: p.lastField,
          authorized: p.authorized,
        })),
      });
    } else {
      onDraftChange(job.id, null);
    }
  }, [editing, labor, parts, job.id, onDraftChange]);

  const view = editing ? { labor, parts } : { labor: initialLabor, parts: initialParts };
  const t = totals(view.labor, view.parts, taxBps);
  const authState = jobAuthState({
    laborLines: view.labor.map((l) => ({ authorized: l.authorized !== false })),
    partLines: view.parts.map((p) => ({ authorized: p.authorized !== false })),
  });

  // Job-level fees/discounts (computed against this job's labor/parts) folded
  // into the job total, honoring the per-job tax flags.
  const jobDiscountTotal = Math.min(
    t.subtotal,
    jobDiscounts.reduce((s, d) => s + adjVal(d, t.laborTotal, t.partsTotal), 0),
  );
  let jobFeeTotal = 0;
  let jobTaxableFees = 0;
  for (const f of jobFees) {
    const v = adjVal(f, t.laborTotal, t.partsTotal);
    jobFeeTotal += v;
    if (f.taxable) jobTaxableFees += v;
  }
  const taxLabor = job.laborTaxable ? t.laborTotal : 0;
  const taxParts = job.partsTaxable ? t.partsTotal : 0;
  const jobTax = Math.round(
    ((Math.max(0, taxLabor + taxParts - jobDiscountTotal) + jobTaxableFees) * taxBps) / 10000,
  );
  const jobGrandTotal = t.subtotal - jobDiscountTotal + jobFeeTotal + jobTax;

  function beginEdit(nextLabor = initialLabor, nextParts = initialParts) {
    setName(job.name);
    setNote(job.note ?? "");
    setLabor(nextLabor);
    setParts(nextParts);
    setFieldDrafts({});
    setError(null);
    setEditing(true);
    setCollapsed(false);
  }

  function startEdit() {
    if (!canEdit) return;
    beginEdit();
  }

  function addLaborLine() {
    if (!canEdit) return;
    if (editing) {
      setLabor((rows) => [...rows, newLaborRow(baseRateCents, laborTiers)]);
      setCollapsed(false);
      return;
    }
    beginEdit([...initialLabor, newLaborRow(baseRateCents, laborTiers)], initialParts);
  }

  function laborRowsFromGuide(lines: { description: string; hours: number }[]): LaborRow[] {
    return lines.map((line) => {
      const base: LaborRow = {
        // Guide/canned-job hits should already carry the operation name — fall
        // back to the job name so the field never renders blank.
        description: line.description.trim() || job.name,
        hours: line.hours,
        costCents: 0,
        rateCents: baseRateCents,
      };
      if (laborTiers.length > 0) {
        return applyLaborMatrixRow({ ...base, useLaborMatrix: true }, baseRateCents, laborTiers);
      }
      return base;
    });
  }

  function addLaborLookup() {
    if (!canEdit) return;
    if (laborGuide) {
      laborGuide.openLaborGuide({
        onAddLines: (lines) => {
          const rows = laborRowsFromGuide(lines);
          if (editing) {
            setLabor((prev) => [...prev, ...rows]);
            setCollapsed(false);
          } else {
            beginEdit([...initialLabor, ...rows], initialParts);
          }
        },
      });
      return;
    }
    addLaborLine();
  }

  function addInlinePartRow(lineType: PartFamilyType = "part") {
    if (!canEdit) return;
    const row = { ...newPartRow(partTiers), lineType };
    if (editing) {
      setParts((rows) => [...rows, row]);
      setCollapsed(false);
      return;
    }
    beginEdit(initialLabor, [...initialParts, row]);
  }

  function addPartManual() {
    if (!canEdit) return;
    addInlinePartRow("part");
  }

  function addPartLookup() {
    if (!canEdit) return;
    if (onOpenParts && variant === "lab") {
      onOpenParts("lookup");
      return;
    }
    addPartManual();
  }

  function addPartLine() {
    addPartManual();
  }

  /** Adds a directly-editable fee/discount row to this job — no dialog. */
  function addJobFee() {
    if (!canEdit) return;
    if (!editing) beginEdit();
    startAdj(async () => {
      const res = await addFee(
        roId,
        { name: "New fee", method: "FIXED", base: "LABOR_PARTS", amount: 0, taxable: false },
        job.id,
      );
      if (res.ok) router.refresh();
    });
  }

  function addJobDiscount() {
    if (!canEdit) return;
    if (!editing) beginEdit();
    startAdj(async () => {
      const res = await addDiscount(
        roId,
        { name: "New discount", method: "FIXED", base: "LABOR_PARTS", amount: 0 },
        job.id,
      );
      if (res.ok) router.refresh();
    });
  }

  function cancelEdit() {
    onDraftChange?.(job.id, null);
    setFieldDrafts({});
    if (variant === "lab" && canEdit) {
      setName(job.name);
      setNote(job.note ?? "");
      setLabor(initialLabor);
      setParts(initialParts);
      return;
    }
    setEditing(false);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveJob({
        jobId: job.id,
        name,
        note: variant === "lab" ? (job.note ?? null) : note || null,
        laborLines: labor.map((l) => ({
          id: l.id,
          description: l.description,
          hours: l.hours,
          costCents: l.costCents,
          rateCents: l.rateCents,
          technicianId: l.technicianId ?? null,
        })),
        partLines: parts.map((p) => ({
          id: p.id,
          brand: p.brand || null,
          description: joinPartDesc(p.description, p.details),
          partNumber: p.partNumber || null,
          quantity: p.quantity,
          costCents: p.costCents,
          retailCents: p.retailCents,
        })),
      });
      if (res.ok) {
        onDraftChange?.(job.id, null);
        setFieldDrafts({});
        if (variant !== "lab") setEditing(false);
        else setLabSaveState("saved");
        toast("success", "Job saved");
        router.refresh();
      } else {
        setError(res.error);
        toast("error", res.error);
        if (variant === "lab") setLabSaveState("dirty");
      }
    });
  }

  function persistLabJob() {
    if (!isLab || !canEdit || pending) return;
    setLabSaveState("saving");
    setError(null);
    start(async () => {
      const res = await saveJob({
        jobId: job.id,
        name,
        note: job.note ?? null,
        laborLines: labor.map((l) => ({
          id: l.id,
          description: l.description,
          hours: l.hours,
          costCents: l.costCents,
          rateCents: l.rateCents,
          technicianId: l.technicianId ?? null,
        })),
        partLines: parts.map((p) => ({
          id: p.id,
          brand: p.brand || null,
          description: joinPartDesc(p.description, p.details),
          partNumber: p.partNumber || null,
          quantity: p.quantity,
          costCents: p.costCents,
          retailCents: p.retailCents,
        })),
      });
      if (res.ok) {
        onDraftChange?.(job.id, null);
        setFieldDrafts({});
        setLabSaveState("saved");
        router.refresh();
      } else {
        setLabSaveState("dirty");
        setError(res.error);
      }
    });
  }

  useEffect(() => {
    if (!isLab || !canEdit || !editing) return;
    if (labAutoSaveSkip.current) {
      labAutoSaveSkip.current = false;
      return;
    }
    setLabSaveState("dirty");
    const timer = window.setTimeout(() => persistLabJob(), 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce draft snapshot
  }, [name, labor, parts, isLab, canEdit, editing]);

  useEffect(() => {
    if (!isLab || labSaveState === "dirty" || labSaveState === "saving" || pending) return;
    setLabor(initialLabor);
    setParts(initialParts);
    setName(job.name);
    labAutoSaveSkip.current = true;
    // Sync when server job data changes after auto-save refresh — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, job.name, job.laborLines, job.partLines, isLab, labSaveState, pending]);

  function remove() {
    if (!canEdit) return;
    if (!confirm(`Delete job "${job.name}"? This removes its labor and parts.`)) return;
    start(async () => {
      const res = await deleteJob(job.id);
      if (res.ok) {
        toast("success", "Job deleted");
        router.refresh();
      } else {
        setError(res.error);
        toast("error", res.error);
      }
    });
  }

  function openSaveAsCanned() {
    setSaveCannedOpen(true);
  }

  const cannedJobPreview = {
    id: job.id,
    name: job.name,
    note: job.note,
    laborLineCount: job.laborLines.length,
    partLineCount: job.partLines.length,
    laborHours: job.laborLines.reduce((s, l) => s + l.hours, 0),
  };

  const calcOpts = { baseRateCents, laborTiers };
  const applyPartRow = (i: number) =>
    setParts((rows) => rows.map((r, j) => (j === i ? applyPartMatrixRow(r, partTiers) : r)));
  const applyLaborRow = (i: number) =>
    setLabor((rows) => rows.map((r, j) => (j === i ? applyLaborMatrixRow(r, baseRateCents, laborTiers) : r)));

  function laborMatrixOn(l: LaborRow) {
    return (
      laborTiers.length > 0 &&
      (l.useLaborMatrix === true ||
        (l.useLaborMatrix !== false && isLaborMatrixApplied(l, baseRateCents, laborTiers)))
    );
  }
  function partMatrixOn(p: PartRow) {
    return (
      partTiers.length > 0 &&
      (p.usePartMatrix === true ||
        (p.usePartMatrix !== false && isPartMatrixApplied(p, partTiers)))
    );
  }
  const jobMatrixOn = view.labor.some(laborMatrixOn) || view.parts.some(partMatrixOn);
  const canApplyJobMatrix =
    (laborTiers.length > 0 && view.labor.length > 0) ||
    (partTiers.length > 0 && view.parts.length > 0);

  function disableAllMatrix() {
    setLabor((rows) => rows.map((r) => ({ ...r, useLaborMatrix: false })));
    setParts((rows) => rows.map((r) => ({ ...r, usePartMatrix: false })));
  }
  function applyAllMatrix() {
    if (laborTiers.length > 0) {
      setLabor((rows) => rows.map((r) => applyLaborMatrixRow(r, baseRateCents, laborTiers)));
    }
    if (partTiers.length > 0) {
      setParts((rows) => rows.map((r) => applyPartMatrixRow(r, partTiers)));
    }
  }

  const CardWrapper = isLab ? EstimateLabJobCardShell : "div";
  const cardWrapperProps = isLab
    ? {
        className: customerApproved ? "border-emerald-500 ring-1 ring-emerald-500/30" : undefined,
      }
    : {
        className: cn(
          "overflow-hidden rounded-lg border-2 bg-white shadow-md ring-1 ring-slate-300/35",
          customerApproved
            ? "border-emerald-500 ring-1 ring-emerald-500/30"
            : jobEdge,
        ),
      };

  return (
    <CardWrapper {...cardWrapperProps}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-1.5 border-b px-2 py-1.5",
          customerApproved ? "border-emerald-200 bg-emerald-50/80" : cn(jobDivider, "bg-muted/30"),
          isLab && "py-1.5",
        )}
      >
        {!editing ? (
          <>
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/50" aria-hidden />
            <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle job">
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            <Checkbox
              checked={authState === "indeterminate" ? "indeterminate" : authState}
              onCheckedChange={(v) => {
                if (v === "indeterminate") onToggleJob?.(true);
                else onToggleJob?.(v === true);
              }}
              disabled={!onToggleJob || quickPending}
              aria-label="Include job in estimate"
            />
            <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{job.name}</span>
            {variant === "lab" ? (
              customerApproved ? (
                renderApprovedBadge()
              ) : job.authorized ? (
                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-50 text-[10px] text-emerald-800">
                  Authorized
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-400/60 bg-amber-50 text-[10px] text-amber-900">
                  Pending approval
                </Badge>
              )
            ) : null}
            {variant !== "lab" ? renderApprovedBadge() : null}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {canEdit ? (
                <>
                  {!isLab ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="Add category — coming soon"
                      className="h-7 gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide"
                    >
                      <FolderPlus className="size-3.5" /> Add Category
                      <ChevronDown className="size-3 opacity-60" />
                    </Button>
                  ) : null}
                  <select
                    className={cn(
                      "rounded-md border border-input bg-background px-1.5 text-[10px] font-semibold uppercase tracking-wide text-foreground",
                      isLab ? "h-7 max-w-[6.5rem]" : "h-7 max-w-[8.5rem] px-2",
                    )}
                    value={job.technicianId ?? ""}
                    onChange={(e) => assignJobTech(e.target.value || null)}
                    disabled={technicians.length === 0 || quickPending}
                    aria-label="Assign technician to job"
                  >
                    <option value="">{variant === "lab" ? "Assign technician" : "+ Assign"}</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {isLab ? (
                    <EstimateLabJobMenu
                      disabled={!canEdit || pending}
                      handlers={{
                        onAddLabor: addLaborLine,
                        onAddPart: addPartManual,
                        onPartLookup: onOpenParts ? () => onOpenParts("lookup") : undefined,
                        onAddFee: addJobFee,
                        onAddDiscount: addJobDiscount,
                        onSaveAsCanned: openSaveAsCanned,
                        onDelete: remove,
                      }}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={startEdit}
                        aria-label="Edit job"
                        title="Edit job"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={remove}
                        disabled={pending}
                        aria-label="Delete job"
                        title="Delete job"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled
                        title="More actions — coming soon"
                        className="rounded-md p-1.5 text-muted-foreground/60"
                        aria-label="More actions"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </>
        ) : isLab ? (
          <>
            <button
              type="button"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded outline-none",
                jobDragHandle?.listeners
                  ? "cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                  : "cursor-default text-muted-foreground/40",
                jobDragHandle?.isDragging && "opacity-60",
              )}
              aria-label="Drag to reorder job"
              {...(jobDragHandle?.attributes ?? {})}
              {...(jobDragHandle?.listeners ?? {})}
            >
              <GripVertical className="size-3.5" aria-hidden />
            </button>
            <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle job" className="shrink-0">
              {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            <Checkbox
              checked={authState === "indeterminate" ? "indeterminate" : authState}
              onCheckedChange={(v) => {
                if (v === "indeterminate") onToggleJob?.(true);
                else onToggleJob?.(v === true);
              }}
              disabled={!onToggleJob || quickPending}
              aria-label="Include job in estimate"
              className="size-3.5"
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(inputH, "min-w-0 flex-1 border-slate-200 bg-white font-semibold shadow-none")}
              placeholder="Job name"
            />
            {customerApproved ? (
              renderApprovedBadge("hidden sm:inline-flex")
            ) : job.authorized ? (
              <Badge variant="outline" className="hidden border-emerald-500/50 bg-emerald-50 text-[10px] text-emerald-800 sm:inline-flex">
                Authorized
              </Badge>
            ) : (
              <Badge variant="outline" className="hidden border-amber-400/60 bg-amber-50 text-[10px] text-amber-900 sm:inline-flex">
                Pending
              </Badge>
            )}
            <select
              className="hidden h-7 max-w-[6.5rem] rounded-md border border-input bg-background px-1.5 text-[10px] font-semibold uppercase tracking-wide text-foreground sm:block"
              value={job.technicianId ?? ""}
              onChange={(e) => assignJobTech(e.target.value || null)}
              disabled={technicians.length === 0 || quickPending}
              aria-label="Assign technician to job"
            >
              <option value="">Tech</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <EstimateLabSaveStatus state={labSaveState} />
              <EstimateLabJobMenu
                disabled={!canEdit || pending}
                handlers={{
                  onAddLabor: addLaborLine,
                  onAddPart: addPartManual,
                  onPartLookup: onOpenParts ? () => onOpenParts("lookup") : undefined,
                  onAddFee: addJobFee,
                  onAddDiscount: addJobDiscount,
                  onSaveAsCanned: openSaveAsCanned,
                  onDelete: remove,
                }}
              />
            </div>
          </>
        ) : (
          <>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 min-w-0 flex-1 border-slate-200 bg-white font-semibold shadow-none"
              placeholder="Job name"
            />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={openSaveAsCanned}
                disabled={pending}
                className="gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy hover:text-brand-navy"
              >
                <Plus className="size-3.5" /> Add Canned Job
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={pending} className="text-xs font-semibold uppercase">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={pending}
                className="gap-1.5 bg-brand-navy px-5 text-xs font-semibold uppercase hover:bg-brand-navy/90"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
              </Button>
            </div>
          </>
        )}
      </div>

      {variant === "lab" ? (
        <EstimateLabJobNotes jobId={job.id} initialNote={job.note} canEdit={canEdit} />
      ) : null}

      {error ? <p className="px-3 pt-2 text-sm text-destructive">{error}</p> : null}

      <SaveAsCannedJobDialog
        open={saveCannedOpen}
        onOpenChange={setSaveCannedOpen}
        job={saveCannedOpen ? cannedJobPreview : null}
        categories={cannedJobCategories}
        onSaved={() => {
          toast("success", "Saved as canned job");
          router.refresh();
        }}
      />

      {!collapsed || editing ? (
        <>
          {isLab ? (
            <>
              {editing ? <EstimateLabServiceItemsHeader /> : null}
              <EstimateLabServiceItemsGrid
                labor={view.labor}
                parts={view.parts}
                fees={jobFees}
                discounts={jobDiscounts}
                editing={editing}
                baseRateCents={baseRateCents}
                laborTiers={laborTiers}
                partTiers={partTiers}
                fieldDrafts={fieldDrafts}
                setFieldDraft={setFieldDraft}
                clearFieldDraft={clearFieldDraft}
                focusFieldDraft={focusFieldDraft}
                onLaborChange={setLabor}
                onPartsChange={setParts}
                onAddLine={(type) => {
                  if (type === "labor") {
                    addLaborLine();
                    return;
                  }
                  if (type === "fee" || type === "discount") return;
                  if (isPartFamilyType(type)) addInlinePartRow(type);
                }}
                onLaborManual={addLaborLine}
                onLaborLookup={addLaborLookup}
                onPartManual={addPartManual}
                onPartLookup={addPartLookup}
                roId={roId}
                jobId={job.id}
                laborCents={t.laborTotal}
                partsCents={t.partsTotal}
                feeTemplates={feeTemplates}
                discountTemplates={discountTemplates}
                laborTaxable={job.laborTaxable}
                partsTaxable={job.partsTaxable}
                onToggleLaborTax={(v) => toggleTax({ laborTaxable: v })}
                onTogglePartsTax={(v) => toggleTax({ partsTaxable: v })}
              />
            </>
          ) : (
            <>
          {/* Labor */}
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className={tableHeadClass}>
                <th className={cn(COL_GRIP, cellPad)} />
                {editing ? <th className={cn(COL_TYPE, "text-left font-medium", cellPad)}>Type</th> : null}
                <th className={cn(cellPad, "text-left font-medium")}>Labor</th>
                <th className={cn(COL_QTY, "text-right font-medium", cellPad)}>Hours</th>
                <th className={cn(COL_COST, "text-right font-medium", cellPad)}>Cost</th>
                <th className={cn(COL_RATE, "text-right font-medium", cellPad)}>Rate</th>
                <th className={cn(COL_TOTAL, "text-right font-medium", cellPad)}>Total</th>
                {editing ? <th className={cn(COL_REMOVE, cellPad)} /> : null}
              </tr>
            </thead>
            <tbody>
              {view.labor.map((l, i) => (
                <tr key={l.id ?? `new-${i}`} className={cn("border-b last:border-0", jobRowDivider)}>
                  <td className="px-3 py-2">
                    <GripVertical className="size-4 text-muted-foreground/40" aria-hidden />
                  </td>
                  {editing ? (
                    <td className="px-3 py-1.5">
                      <EstimateLineTypeMenu
                        value="labor"
                        scope="labor"
                        editing={editing}
                        size="table"
                        showWrenchIcon={!isLab}
                        typeOptions={["labor"]}
                        onChange={() => {
                          /* Labor rows stay labor; Labor Book / custom live in the menu actions. */
                        }}
                        handlers={{
                          onLaborFromGuide: addLaborLookup,
                          onCustomLabor: addLaborLine,
                        }}
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-1.5">
                    {editing ? (
                      <Input
                        value={l.description}
                        onChange={(e) =>
                          setLabor((rows) => rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))
                        }
                        className="h-8 min-w-0 w-full"
                        placeholder="Labor description"
                      />
                    ) : (
                      <div className={l.authorized === false ? "text-foreground/45 line-through" : undefined}>
                        <span className="text-brand-navy">{l.description}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {editing ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={draftValue(fieldDrafts, `l${i}-hours`, formatLaborHours(l.hours))}
                        onFocus={() => focusFieldDraft(`l${i}-hours`, formatLaborHours(l.hours))}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!isDecimalInput(v)) return;
                          setFieldDraft(`l${i}-hours`, v);
                          const n = parseOptionalFloat(v);
                          if (n !== null) {
                            setLabor((rows) =>
                              rows.map((r, j) => (j === i ? patchLaborLine(r, "hours", n, calcOpts) : r)),
                            );
                          }
                        }}
                        onBlur={(e) => {
                          const key = `l${i}-hours`;
                          const n = parseOptionalFloat(e.target.value) ?? 0;
                          setLabor((rows) =>
                            rows.map((r, j) => (j === i ? patchLaborLine(r, "hours", n, calcOpts) : r)),
                          );
                          clearFieldDraft(key);
                        }}
                        className="h-8 w-full min-w-0 text-right tabular-nums"
                        aria-label="Labor hours"
                      />
                    ) : (
                      <span
                        className={cn(
                          "inline-block w-full text-right tabular-nums",
                          l.authorized === false ? "text-foreground/45 line-through" : undefined,
                        )}
                      >
                        {l.hours ? formatLaborHours(l.hours) : "0"}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-1.5 text-right tabular-nums",
                      l.authorized === false && !editing ? "text-foreground/45 line-through" : "",
                    )}
                  >
                    {editing ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={draftValue(fieldDrafts, `l${i}-cost`, dollars(l.costCents))}
                        onFocus={() => focusFieldDraft(`l${i}-cost`, dollars(l.costCents))}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!isDecimalInput(v)) return;
                          setFieldDraft(`l${i}-cost`, v);
                          const cents = parseOptionalCents(v);
                          if (cents !== null) {
                            setLabor((rows) =>
                              rows.map((r, j) => (j === i ? { ...r, costCents: cents } : r)),
                            );
                          }
                        }}
                        onBlur={(e) => {
                          const key = `l${i}-cost`;
                          const cents = parseOptionalCents(e.target.value) ?? 0;
                          setLabor((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, costCents: cents } : r)),
                          );
                          clearFieldDraft(key);
                        }}
                        className="h-8 w-full min-w-0 text-right tabular-nums"
                        aria-label="Labor cost"
                      />
                    ) : (
                      formatCents(l.costCents)
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {editing ? (
                      (() => {
                        const matrixOn =
                          laborTiers.length > 0 &&
                          (l.useLaborMatrix === true ||
                            (l.useLaborMatrix !== false &&
                              isLaborMatrixApplied(l, baseRateCents, laborTiers)));
                        const tooltip = laborMatrixTooltip(l.hours, laborTiers, baseRateCents);
                        if (matrixOn) {
                          return (
                            <MatrixStatusPill
                              label="Auto labor pricing"
                              tooltip={tooltip}
                              onToggleOff={() =>
                                setLabor((rows) =>
                                  rows.map((r, j) => (j === i ? { ...r, useLaborMatrix: false } : r)),
                                )
                              }
                            />
                          );
                        }
                        return (
                          <div className="flex items-center justify-end gap-1">
                            {laborTiers.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => applyLaborRow(i)}
                                title="Apply labor matrix to this line"
                                aria-label="Apply labor matrix to this line"
                                className="cursor-pointer rounded outline-none text-emerald-700 hover:text-emerald-900 focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Wand2 className="size-3.5" aria-hidden />
                              </button>
                            ) : null}
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={draftValue(fieldDrafts, `l${i}-rate`, dollars(l.rateCents))}
                              onFocus={() => focusFieldDraft(`l${i}-rate`, dollars(l.rateCents))}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (!isDecimalInput(v)) return;
                                setFieldDraft(`l${i}-rate`, v);
                                const cents = parseOptionalCents(v);
                                if (cents !== null) {
                                  setLabor((rows) =>
                                    rows.map((r, j) => (j === i ? patchLaborLine(r, "rate", cents, calcOpts) : r)),
                                  );
                                }
                              }}
                              onBlur={(e) => {
                                const key = `l${i}-rate`;
                                const cents = parseOptionalCents(e.target.value) ?? 0;
                                setLabor((rows) =>
                                  rows.map((r, j) => (j === i ? patchLaborLine(r, "rate", cents, calcOpts) : r)),
                                );
                                clearFieldDraft(key);
                              }}
                              className="h-8 w-full min-w-0 text-right"
                            />
                          </div>
                        );
                      })()
                    ) : (
                      (() => {
                        const lineThrough = l.authorized === false ? "text-foreground/45 line-through" : undefined;
                        return (
                          <span className={`tabular-nums ${lineThrough ?? "font-medium"}`}>
                            {formatCents(l.rateCents)}
                          </span>
                        );
                      })()
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {editing ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={draftValue(fieldDrafts, `l${i}-total`, dollars(laborLineTotal(l)))}
                        onFocus={() => focusFieldDraft(`l${i}-total`, dollars(laborLineTotal(l)))}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!isDecimalInput(v)) return;
                          setFieldDraft(`l${i}-total`, v);
                          const cents = parseOptionalCents(v);
                          if (cents !== null) {
                            setLabor((rows) =>
                              rows.map((r, j) => (j === i ? patchLaborLine(r, "total", cents, calcOpts) : r)),
                            );
                          }
                        }}
                        onBlur={(e) => {
                          const key = `l${i}-total`;
                          const cents = parseOptionalCents(e.target.value) ?? 0;
                          setLabor((rows) =>
                            rows.map((r, j) => (j === i ? patchLaborLine(r, "total", cents, calcOpts) : r)),
                          );
                          clearFieldDraft(key);
                        }}
                        className="h-8 w-full min-w-0 text-right tabular-nums"
                        aria-label="Labor total"
                      />
                    ) : (
                      <span className={l.authorized === false ? "text-foreground/45 line-through" : undefined}>
                        {formatCents(laborLineTotal(l))}
                      </span>
                    )}
                  </td>
                  {editing ? (
                    <td className={REMOVE_CELL}>
                      <button
                        type="button"
                        onClick={() => setLabor((rows) => rows.filter((_, j) => j !== i))}
                        aria-label="Remove labor"
                        className="inline-flex size-7 items-center justify-center"
                      >
                        <X className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>

          {editing && !isLab ? (
            <div className={cn("flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2", jobDivider)}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy hover:text-brand-navy"
                onClick={() => setLabor((rows) => [...rows, newLaborRow(baseRateCents, laborTiers)])}
              >
                <Plus className="size-4" /> Add Labor
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy hover:bg-brand-light/10 hover:text-brand-navy"
                onClick={addLaborLookup}
                title="Labor Book — search flat-rate operations"
              >
                <ListTree className="size-4" /> Labor Book
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                disabled
                title="Maintenance schedule — coming soon"
              >
                <Search className="size-4" /> Maintenance Schedule
              </Button>
            </div>
          ) : null}

          {/* Parts — always visible in view mode */}
          {view.parts.length > 0 || editing || canEdit ? (
            <table className={cn("w-full table-fixed border-t text-sm", jobDivider)}>
              <thead>
                <tr className={tableHeadClass}>
                  <th className={cn(COL_GRIP, cellPad)} />
                  {editing ? <th className={cn(COL_TYPE, "text-left font-medium", cellPad)}>Type</th> : null}
                  <th className={cn(cellPad, "text-left font-medium")}>{editing ? "Parts" : "Part"}</th>
                  <th className={cn(COL_QTY, "text-right font-medium", cellPad)}>Qty</th>
                  <th className={cn(COL_COST, "text-right font-medium", cellPad)}>Cost</th>
                  <th className={cn(COL_RATE, "text-right font-medium", cellPad)}>Retail</th>
                  <th className={cn(COL_TOTAL, "text-right font-medium", cellPad)}>Total</th>
                  {editing ? <th className={cn(COL_REMOVE, cellPad)} /> : null}
                </tr>
              </thead>
              <tbody>
                {view.parts.length === 0 && !editing ? (
                  <tr>
                    <td colSpan={editing ? 8 : 6} className="px-3 py-3 text-sm text-muted-foreground">
                      No parts on this job.
                    </td>
                  </tr>
                ) : null}
                {view.parts.map((p, i) => (
                  <tr
                    key={p.id ?? `new-${i}`}
                    className={cn(
                      "border-b last:border-0",
                      jobRowDivider,
                      isLab && editing ? "align-middle" : "align-top",
                    )}
                  >
                    <td className={isLab ? cellPadSm : "px-3 py-2"}>
                      {!editing ? (
                        <GripVertical className="size-4 text-muted-foreground/40" aria-hidden />
                      ) : null}
                    </td>
                    {editing ? (
                    <td className={isLab ? cellPadSm : "px-3 py-2"}>
                      <EstimateLineTypeMenu
                        value={p.lineType ?? "part"}
                        scope="part"
                        editing={editing}
                        size="table"
                        showWrenchIcon={!isLab}
                        typeOptions={TEKMETRIC_PART_TYPES}
                        onChange={(t) => {
                          if (t === "labor") return;
                          if (!isPartFamilyType(t)) return;
                          setParts((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, lineType: t } : r)),
                          );
                        }}
                        handlers={{
                          onPartFromGuide: addPartLookup,
                          onCustomPart: () => addInlinePartRow(p.lineType ?? "part"),
                        }}
                      />
                    </td>
                    ) : null}
                    <td className={isLab ? cellPadSm : "px-3 py-2"}>
                      {editing ? (
                        isLab ? (
                          <div className="flex min-w-0 items-center gap-1">
                            <Input
                              value={p.description}
                              onChange={(e) =>
                                setParts((rows) =>
                                  rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)),
                                )
                              }
                              className={cn(inputH, "min-w-0 flex-[2] text-xs")}
                              placeholder="Description"
                            />
                            <Input
                              value={p.partNumber}
                              onChange={(e) =>
                                setParts((rows) =>
                                  rows.map((r, j) => (j === i ? { ...r, partNumber: e.target.value } : r)),
                                )
                              }
                              className={cn(inputH, "w-[4.75rem] shrink-0 font-mono text-xs")}
                              placeholder="Part #"
                            />
                            <Input
                              value={p.brand}
                              onChange={(e) =>
                                setParts((rows) => rows.map((r, j) => (j === i ? { ...r, brand: e.target.value } : r)))
                              }
                              className={cn(inputH, "w-[4.25rem] shrink-0 text-xs")}
                              placeholder="Brand"
                            />
                          </div>
                        ) : (
                        <div className="space-y-1">
                          <div className="grid grid-cols-[1fr_auto] gap-1">
                            <div className="relative">
                              <Input
                                value={p.description}
                                onChange={(e) =>
                                  setParts((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)),
                                  )
                                }
                                className="h-8 pr-8 text-sm"
                                placeholder="Part description"
                              />
                              <Save className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" aria-hidden />
                            </div>
                            <Input
                              value={p.brand}
                              onChange={(e) =>
                                setParts((rows) => rows.map((r, j) => (j === i ? { ...r, brand: e.target.value } : r)))
                              }
                              className="h-8 w-28 text-sm"
                              placeholder="Brand"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <Input
                              value={p.partNumber}
                              onChange={(e) =>
                                setParts((rows) =>
                                  rows.map((r, j) => (j === i ? { ...r, partNumber: e.target.value } : r)),
                                )
                              }
                              className="h-8 text-xs"
                              placeholder="Part number"
                            />
                            <Input
                              value={p.details}
                              onChange={(e) =>
                                setParts((rows) =>
                                  rows.map((r, j) => (j === i ? { ...r, details: e.target.value } : r)),
                                )
                              }
                              className="h-8 text-xs"
                              placeholder="Additional details"
                              aria-label="Additional details"
                            />
                          </div>
                        </div>
                        )
                      ) : (
                        <div className={p.authorized === false ? "text-foreground/45 line-through" : undefined}>
                          <span>
                            {p.description}
                            {p.brand ? <span className="text-muted-foreground"> {p.brand}</span> : null}
                            <span
                              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                p.source === "PARTSTECH"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {p.source === "PARTSTECH" ? "Quoted" : "Needed"}
                            </span>
                          </span>
                          {p.partNumber ? (
                            <div className="text-xs text-muted-foreground">{p.partNumber}</div>
                          ) : null}
                          {p.details ? (
                            <div className="text-xs text-muted-foreground">{p.details}</div>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className={cn(isLab ? cellPadSm : "px-3 py-1.5", "text-right tabular-nums", p.authorized === false && !editing ? "text-foreground/45 line-through" : "")}>
                      {editing ? (
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={draftValue(fieldDrafts, `p${i}-qty`, p.quantity ? String(p.quantity) : "")}
                          onFocus={() => focusFieldDraft(`p${i}-qty`, p.quantity ? String(p.quantity) : "")}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!/^\d*$/.test(v)) return;
                            setFieldDraft(`p${i}-qty`, v);
                            const n = v === "" ? null : parseInt(v, 10);
                            if (n !== null && !Number.isNaN(n)) {
                              setParts((rows) =>
                                rows.map((r, j) => (j === i ? patchPartLine(r, "qty", n, partTiers) : r)),
                              );
                            }
                          }}
                          onBlur={(e) => {
                            const key = `p${i}-qty`;
                            const n = e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0;
                            setParts((rows) =>
                              rows.map((r, j) => (j === i ? patchPartLine(r, "qty", n, partTiers) : r)),
                            );
                            clearFieldDraft(key);
                          }}
                          className={cn(inputH, "w-full min-w-0 text-right")}
                        />
                      ) : (
                        p.quantity
                      )}
                    </td>
                    <td className={cn(isLab ? cellPadSm : "px-3 py-1.5", "text-right tabular-nums", p.authorized === false && !editing ? "text-foreground/45 line-through" : "")}>
                      {editing ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={draftValue(fieldDrafts, `p${i}-cost`, dollars(p.costCents))}
                            onFocus={() => focusFieldDraft(`p${i}-cost`, dollars(p.costCents))}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!isDecimalInput(v)) return;
                              setFieldDraft(`p${i}-cost`, v);
                              const cents = parseOptionalCents(v);
                              if (cents !== null) {
                                setParts((rows) =>
                                  rows.map((r, j) => (j === i ? patchPartLine(r, "cost", cents, partTiers) : r)),
                                );
                              }
                            }}
                            onBlur={(e) => {
                              const key = `p${i}-cost`;
                              const cents = parseOptionalCents(e.target.value) ?? 0;
                              setParts((rows) =>
                                rows.map((r, j) => (j === i ? patchPartLine(r, "cost", cents, partTiers) : r)),
                              );
                              clearFieldDraft(key);
                            }}
                            className={cn(inputH, "w-full min-w-0 text-right")}
                          />
                      ) : (
                        formatCents(p.costCents)
                      )}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${p.authorized === false && !editing ? "text-foreground/45 line-through" : ""}`}>
                      {editing ? (
                        (() => {
                          const matrixOn =
                            partTiers.length > 0 &&
                            (p.usePartMatrix === true ||
                              (p.usePartMatrix !== false && isPartMatrixApplied(p, partTiers)));
                          const tooltip = partMatrixTooltip(p.costCents, partTiers);
                          if (matrixOn) {
                            return (
                              <MatrixStatusPill
                                label={isLab ? "Auto pricing" : "Auto parts pricing"}
                                tooltip={tooltip}
                                compact={isLab}
                                onToggleOff={() =>
                                  setParts((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, usePartMatrix: false } : r)),
                                  )
                                }
                              />
                            );
                          }
                          return (
                            <div className="flex items-center justify-end gap-1">
                              {partTiers.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => applyPartRow(i)}
                                  title="Apply parts matrix to this line"
                                  aria-label="Apply parts matrix to this line"
                                  className="cursor-pointer rounded outline-none text-emerald-700 hover:text-emerald-900 focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Wand2 className="size-3.5" aria-hidden />
                                </button>
                              ) : null}
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={draftValue(fieldDrafts, `p${i}-retail`, dollars(p.retailCents))}
                                onFocus={() => focusFieldDraft(`p${i}-retail`, dollars(p.retailCents))}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!isDecimalInput(v)) return;
                                  setFieldDraft(`p${i}-retail`, v);
                                  const cents = parseOptionalCents(v);
                                  if (cents !== null) {
                                    setParts((rows) =>
                                      rows.map((r, j) => (j === i ? patchPartLine(r, "retail", cents, partTiers) : r)),
                                    );
                                  }
                                }}
                                onBlur={(e) => {
                                  const key = `p${i}-retail`;
                                  const cents = parseOptionalCents(e.target.value) ?? 0;
                                  setParts((rows) =>
                                    rows.map((r, j) => (j === i ? patchPartLine(r, "retail", cents, partTiers) : r)),
                                  );
                                  clearFieldDraft(key);
                                }}
                                className="h-8 w-full min-w-0 text-right"
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <span className={`tabular-nums ${p.authorized === false ? "text-foreground/45 line-through" : "font-medium"}`}>
                          {formatCents(p.retailCents)}
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${p.authorized === false && !editing ? "text-foreground/45 line-through" : ""}`}>
                      {editing ? (
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={draftValue(fieldDrafts, `p${i}-total`, dollars(partLineTotal(p)))}
                          onFocus={() => focusFieldDraft(`p${i}-total`, dollars(partLineTotal(p)))}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!isDecimalInput(v)) return;
                            setFieldDraft(`p${i}-total`, v);
                            const cents = parseOptionalCents(v);
                            if (cents !== null) {
                              setParts((rows) =>
                                rows.map((r, j) => (j === i ? patchPartLine(r, "total", cents, partTiers) : r)),
                              );
                            }
                          }}
                          onBlur={(e) => {
                            const key = `p${i}-total`;
                            const cents = parseOptionalCents(e.target.value) ?? 0;
                            setParts((rows) =>
                              rows.map((r, j) => (j === i ? patchPartLine(r, "total", cents, partTiers) : r)),
                            );
                            clearFieldDraft(key);
                          }}
                          className="h-8 w-full min-w-0 text-right tabular-nums"
                          aria-label="Part total"
                        />
                      ) : (
                        formatCents(partLineTotal(p))
                      )}
                    </td>
                    {editing ? (
                      <td className={REMOVE_CELL}>
                        <button
                          type="button"
                          onClick={() => setParts((rows) => rows.filter((_, j) => j !== i))}
                          aria-label="Remove part"
                          className="inline-flex size-7 items-center justify-center"
                        >
                          <X className="size-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="w-full border-t border-border bg-muted/10 px-4 py-3 text-left text-sm text-muted-foreground">
              No parts on this job.
            </div>
          )}

            </>
          )}

          {editing && !isLab ? (
            <div className="flex items-center gap-2 border-t border-border bg-white px-3 py-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(LAB_LINE_ACTION, "border-brand-navy/20 font-semibold normal-case tracking-normal")}
                onClick={() => setParts((rows) => [...rows, newPartRow(partTiers)])}
              >
                <Plus className="size-4" /> Add Part
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </div>
          ) : null}

          {editing && variant !== "lab" ? (
            <div className="space-y-3 border-t border-border bg-white px-3 py-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-foreground">Note:</span>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note to this job visible to customers"
                  className="min-h-[56px] resize-y border-slate-200 text-sm shadow-none"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={pending} className="text-xs font-semibold uppercase">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={pending}
                  className="gap-1.5 bg-brand-navy px-5 text-xs font-semibold uppercase hover:bg-brand-navy/90"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
                </Button>
              </div>
            </div>
          ) : null}

          {/* GP + totals footer — view mode; lab keeps totals visible while editing */}
          {!editing || isLab ? (
          <div className={cn("flex items-stretch border-t", jobDivider, isLab ? "bg-slate-50/80" : "bg-slate-100/90")}>
            <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1", isLab ? "px-2 py-1.5 text-[11px]" : "gap-x-3 gap-y-1.5 px-3 py-2 text-xs")}>
              {isLab && (jobMatrixOn || (editing && canApplyJobMatrix && canEdit)) ? (
                jobMatrixOn ? (
                  <MatrixStatusPill
                    label="Auto"
                    tooltip="Labor and part prices follow shop markup matrices"
                    onToggleOff={editing && canEdit ? disableAllMatrix : undefined}
                    viewOnly={!editing || !canEdit}
                    compact
                  />
                ) : (
                  <button
                    type="button"
                    onClick={applyAllMatrix}
                    title="Apply matrix pricing to all lines"
                    aria-label="Apply matrix pricing to all lines"
                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-brand-navy/30 bg-white px-1.5 py-0.5 text-[9px] font-medium text-brand-navy/80 hover:border-brand-navy/45 hover:bg-brand-light/10"
                  >
                    <span
                      className="inline-flex size-3 shrink-0 items-center justify-center rounded-[3px] border border-brand-navy/35 bg-white"
                      aria-hidden
                    />
                    <Wand2 className="size-3 shrink-0" aria-hidden />
                    Auto
                  </button>
                )
              ) : null}
              <span><span className="text-muted-foreground">GP$ </span><b className="text-foreground">{formatCents(t.gp)}</b></span>
              <span><span className="text-muted-foreground">GP% </span><b className="text-foreground">{t.gpPct.toFixed(2)}%</b></span>
              <span>
                <span className="text-muted-foreground">GP/Hr </span>
                <b className={gpGoalCents != null && t.gpHr < gpGoalCents ? "text-rose-600" : "text-foreground"}>
                  {formatCents(Math.round(t.gpHr))}
                </b>
                {gpGoalCents != null ? (
                  <span className="ml-1 text-muted-foreground/70">/ {formatCents(gpGoalCents)}</span>
                ) : null}
              </span>
            </div>
            <div className={cn("ml-auto flex shrink-0 items-stretch divide-x border-l bg-white", jobDivider, isLab ? "divide-border" : "divide-slate-300")}>
              <TotalBox
                label="Subtotal"
                value={formatCents(t.subtotal)}
                icon={<Lock className="size-3 text-muted-foreground/50" aria-hidden />}
              />
              <TotalBox
                label="Labor Tax est."
                value={formatCents(t.laborTax)}
                checkbox={
                  <Checkbox
                    checked={job.laborTaxable}
                    disabled={!canEdit || quickPending}
                    onCheckedChange={(v) => toggleTax({ laborTaxable: v === true })}
                    aria-label="Labor taxable"
                    className="size-3.5"
                  />
                }
              />
              <TotalBox
                label="Parts Tax est."
                value={formatCents(t.partsTax)}
                checkbox={
                  <Checkbox
                    checked={job.partsTaxable}
                    disabled={!canEdit || quickPending}
                    onCheckedChange={(v) => toggleTax({ partsTaxable: v === true })}
                    aria-label="Parts taxable"
                    className="size-3.5"
                  />
                }
              />
              {jobDiscountTotal > 0 ? (
                <TotalBox label="Discount" value={`−${formatCents(jobDiscountTotal)}`} />
              ) : null}
              {jobFeeTotal > 0 ? (
                <TotalBox label="Fee" value={`+${formatCents(jobFeeTotal)}`} />
              ) : null}
              <TotalBox label={variant === "lab" ? "Job total" : "Job Total"} value={formatCents(jobGrandTotal)} bold />
            </div>
          </div>
          ) : null}
        </>
      ) : null}
    </CardWrapper>
  );
}
