"use client";

/**
 * Order summary right rail — Palette C Money → Status → Profitability → Specs.
 * Visual restyle only; preserves payment/send/print/deposit/workflow/approval wiring.
 * IA: agents/EstimateBuilding/RIGHT-RAIL-IA.md
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  PanelRight,
  Printer,
  Send,
  Wallet,
} from "lucide-react";

import { EstimateLabRightRailFees } from "@/components/estimate-building/estimate-lab-right-rail-fees";
import { EstimateLabMessagesHost } from "@/components/estimate-building/estimate-lab-messages-host";
import {
  EstimateLabVehicleSpecsLazy,
  type VehicleSpecsIdentitySummary,
} from "@/components/estimate-building/estimate-lab-vehicle-specs-lazy";
import { useEstimateLabPartsOptional } from "@/components/estimate-building/estimate-lab-parts-provider";
import {
  usePartsTechUiEnabled,
  useStripePaymentsUiEnabled,
} from "@/lib/shop-capabilities";

import { EstimateDepositRequestDialog } from "@/components/estimate-building/estimate-deposit-request-dialog";
import {
  type EstimateLabQuickReferenceData,
} from "@/components/estimate-building/estimate-lab-quick-reference";
import {
  effectiveLabPaidCents,
  useEstimateLabDisplay,
} from "@/components/estimate-building/estimate-lab-display-context";
import { EstimateLabPaymentStatusMenu } from "@/components/estimate-building/estimate-lab-payment-status-menu";
import { PrintMenu } from "@/components/repair-order/print-menu";
import { ShareMenu } from "@/components/repair-order/share-menu";
import { RoWorkflowDropdown } from "@/components/repair-order/ro-workflow-dropdown";
import { AuthorizeEstimateDialog } from "@/components/repair-order/authorize-estimate-dialog";
import { useRoSidebarSave } from "@/components/repair-order/ro-sidebar-field-dialogs";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import { useEstimateSelection } from "@/components/repair-order/estimate-selection-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DepositRequestStatus } from "@/generated/prisma";
import type { ROStatus } from "@/generated/prisma";
import { fmtDateTime, toDate } from "@/lib/datetime";
import { formatCents } from "@/lib/format";
import type { NamedFeeLine } from "@/lib/ro-totals";
import { paymentDisplayStatus } from "@/lib/payment-status";
import { cn } from "@/lib/utils";
import type { RepairOrderDetail } from "@/server/repair-order";

type StaffPick = { id: string; name: string };
type RoFeeLine = RepairOrderDetail["fees"][number];

type DepositInfo = {
  id: string;
  amountCents: number;
  note: string | null;
  status: DepositRequestStatus;
  sentAt: Date | null;
  paidAt: Date | null;
  shareUrl: string;
};

type AuthJob = {
  id: string;
  approvedAt: Date | null;
  authorized: boolean;
  laborLines: { authorized: boolean }[];
  partLines: { authorized: boolean }[];
};

export type EstimateLabProfitability = {
  gpCents: number;
  gpPct: number;
  gpPerHourCents: number | null;
  gpGoalCents?: number | null;
  laborGpCents: number;
  laborGpPct: number | null;
  partsGpCents: number;
  partsGpPct: number | null;
  totalRevenueCents: number;
  billableHours: number;
  effectiveLaborRateCents: number | null;
};

export type EstimateLabFinancialSummary = {
  laborCents: number;
  partsCents: number;
  tireCents: number;
  otherCents: number;
  shopSuppliesCents: number;
  serviceDiscountsCents: number;
  roDiscountsCents: number;
  serviceFeesCents: number;
  roFeesCents: number;
  feeLines: NamedFeeLine[];
  taxCents: number;
  taxLabel: string;
  estimateTotalCents: number;
  paidCents: number;
  remainingCents: number;
};

type FeeTemplate = {
  name: string;
  method: "PERCENT" | "FIXED";
  base: "LABOR" | "PARTS" | "LABOR_PARTS";
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
};

export type EstimateLabRightRailProps = {
  roId: string;
  roNumber: number;
  roStatus: ROStatus;
  canArchive?: boolean;
  customerId: string;
  customerName: string;
  customerFirstName: string;
  phone: string | null;
  email: string | null;
  /** Same phone list as header ShareMenu (primary + alt). */
  sharePhones: { label: string; value: string }[];
  marketingOptIn: boolean;
  shopName: string;
  canEdit: boolean;
  approvable: boolean;
  jobs: AuthJob[];
  financial: EstimateLabFinancialSummary;
  deposit: DepositInfo | null;
  estimateTotalCents: number;
  profitability?: EstimateLabProfitability | null;
  quickReference?: EstimateLabQuickReferenceData | null;
  /** When set, Specs rail is on-demand (no eager catalog / AI). */
  vehicleId?: string | null;
  /** Lightweight identity for always-visible rail (no Specs API). */
  vehicleIdentitySummary?: VehicleSpecsIdentitySummary | null;
  /** Shop technicians for Status-card assign picker (same source as RO sidebar). */
  technicians?: StaffPick[];
  /** Design-mode-only "preview a payment status" override. Defaults to true; set false on production ROs so the strip always reflects real invoice data. */
  allowPaymentPreview?: boolean;
  /** ShareMenu parity with RO header (inspection / estimate / invoice). */
  invoiceId: string | null;
  invoiceNumber: number | null;
  inspectionId?: string | null;
  /** RO-level fees for the compact right-rail editor (estimate workspace only). */
  roFees?: RoFeeLine[];
  feeTemplates?: FeeTemplate[];
  jobCount?: number;
};

const RAIL_CARD =
  "rounded-none border-[1.5px] border-[var(--jb-line,#dde5ef)] bg-[var(--jb-card,#ffffff)] shadow-[0_1px_2px_rgba(11,31,59,0.05)]";

const RAIL_PALETTE_STYLE = {
  "--jb-ink": "#0b1f3b",
  "--jb-azure": "#1e7fe0",
  "--jb-orange": "#e86a10",
  "--jb-green": "#1c9e5a",
  "--jb-red": "#c93838",
  "--jb-slate": "#5b7295",
  "--jb-faint": "#8ca2c0",
  "--jb-surface": "#f0f3f8",
  "--jb-card": "#ffffff",
  "--jb-line": "#dde5ef",
  "--jb-hover-line": "#b9c8dc",
} as CSSProperties;

function usePreviewFinancial(financial: EstimateLabFinancialSummary): EstimateLabFinancialSummary {
  const { paymentPreview } = useEstimateLabDisplay();
  return useMemo(() => {
    const paidCents = effectiveLabPaidCents(
      paymentPreview,
      financial.paidCents,
      financial.estimateTotalCents,
    );
    return {
      ...financial,
      paidCents,
      remainingCents: Math.max(0, financial.estimateTotalCents - paidCents),
    };
  }, [financial, paymentPreview]);
}

const RAIL_DT_OPTS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** Compact date for narrow Status meta values (no time — full stamp on hover). */
const RAIL_DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

function fmtDate(d: Date | string) {
  return fmtDateTime(d, RAIL_DT_OPTS);
}

function fmtRailDate(d: Date | string) {
  return fmtDateTime(d, RAIL_DATE_OPTS);
}

/** e.g. "Authorized · Jul 18" — fits ~302px rail; title carries full datetime. */
function fmtOutreach(status: string, at: Date | string) {
  return `${status} · ${fmtRailDate(at)}`;
}

function fmtOutreachTitle(status: string, at: Date | string) {
  return `${status} ${fmtDate(at)}`;
}

/** Relative age — coerce RSC-serialized ISO strings before `.getTime()`. */
function fmtRelativeDays(from: Date | string) {
  const days = Math.floor((Date.now() - toDate(from).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Visual-only pipeline steps mapped from ROStatus + payment — not a new status machine.
 * Labels mirror ShopRally RO vocabulary (see `RO_STATUS_LABEL` / job board WIP).
 *
 * Index map:
 * 0 EST  ← ESTIMATE
 * 1 APPR ← APPROVED
 * 2 WIP  ← IN_PROGRESS ("Work in progress")
 * 3 DONE ← COMPLETED | INVOICED
 * 4 PAID ← paid in full (invoice/payment state)
 */
function workflowStepIndex(roStatus: ROStatus, paid: boolean): number {
  if (paid) return 4;
  switch (roStatus) {
    case "ESTIMATE":
      return 0;
    case "APPROVED":
      return 1;
    case "IN_PROGRESS":
      return 2;
    case "COMPLETED":
    case "INVOICED":
      return 3;
    default:
      return 0;
  }
}

const WORKFLOW_STEPS = ["Est", "Appr", "WIP", "Done", "Paid"] as const;

function MoneyCard({
  canEdit,
  allowPreview,
  paidCents,
  totalCents,
  roId,
  roNumber,
  customerFirstName,
  customerName,
  shopName,
  sharePhones,
  email,
  invoiceId,
  invoiceNumber,
  inspectionId,
  onDeposit,
  depositPending,
  depositPaid,
  depositAmountCents,
}: {
  canEdit: boolean;
  allowPreview: boolean;
  paidCents: number;
  totalCents: number;
  roId: string;
  roNumber: number;
  customerFirstName: string;
  customerName: string;
  shopName: string;
  sharePhones: { label: string; value: string }[];
  email: string | null;
  invoiceId: string | null;
  invoiceNumber: number | null;
  inspectionId?: string | null;
  onDeposit: () => void;
  depositPending: boolean;
  depositPaid: boolean;
  depositAmountCents?: number;
}) {
  const { paymentPreview } = useEstimateLabDisplay();
  const stripeOnPlan = useStripePaymentsUiEnabled();
  const displayPaid = allowPreview
    ? effectiveLabPaidCents(paymentPreview, paidCents, totalCents)
    : paidCents;
  const displayRemaining = Math.max(0, totalCents - displayPaid);
  const status = paymentDisplayStatus(displayPaid, totalCents);
  const isPreviewing = allowPreview && paymentPreview != null;
  const progressPct =
    totalCents > 0 ? Math.min(100, Math.round((displayPaid / totalCents) * 100)) : 0;

  const topBorder =
    status === "paid"
      ? "border-t-4 border-t-[var(--jb-green,#1c9e5a)]"
      : status === "partial"
        ? "border-t-4 border-t-[#B27A00]"
        : "border-t-4 border-t-[var(--jb-red,#c93838)]";

  const dueColor =
    status === "paid"
      ? "text-[var(--jb-green,#1c9e5a)]"
      : status === "partial"
        ? "text-[#B27A00]"
        : "text-[var(--jb-red,#c93838)]";

  const ghostBtn =
    "flex h-8 flex-1 items-center justify-center gap-1 rounded-none border-[1.5px] border-[var(--jb-line,#dde5ef)] bg-white px-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--jb-ink,#0b1f3b)] shadow-none hover:bg-[var(--jb-surface,#f0f3f8)] focus-visible:ring-2 focus-visible:ring-[var(--jb-azure,#1e7fe0)]/40";

  return (
    <div className={cn(RAIL_CARD, topBorder, "overflow-hidden")}>
      <div className="space-y-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn("flex items-baseline gap-1.5 tabular-nums", dueColor)}>
              <span className="text-2xl font-bold leading-none tracking-tight">
                {formatCents(displayRemaining)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Due</span>
            </div>
            <p className="mt-1 text-[12px] tabular-nums text-[var(--jb-slate,#5b7295)]">
              <span className="font-semibold text-[var(--jb-ink,#0b1f3b)]">
                {formatCents(displayPaid)}
              </span>
              {" paid · "}
              <span className="font-semibold text-[var(--jb-ink,#0b1f3b)]">
                {formatCents(totalCents)}
              </span>
              {" total"}
              {isPreviewing ? (
                <span
                  className="ml-1.5 inline-block rounded-none bg-[#FDF0E2] px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9A5200]"
                  title="Design-mode preview — not written to the invoice"
                >
                  Preview
                </span>
              ) : null}
            </p>
          </div>
          <EstimateLabPaymentStatusMenu
            canEdit={canEdit}
            allowPreview={allowPreview}
            paidCents={displayPaid}
            totalCents={totalCents}
            inline
          />
        </div>

        {totalCents > 0 ? (
          <div
            className="h-1.5 overflow-hidden rounded-none bg-[var(--jb-surface,#f0f3f8)]"
            role="img"
            aria-label={`${progressPct}% paid`}
          >
            <div
              className={cn(
                "h-full transition-[width] duration-200",
                status === "paid"
                  ? "bg-[var(--jb-green,#1c9e5a)]"
                  : status === "partial"
                    ? "bg-[#B27A00]"
                    : "bg-[var(--jb-red,#c93838)]",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        ) : null}

        <Button
          type="button"
          asChild
          className="h-9 w-full rounded-none border-0 bg-[var(--jb-orange,#e86a10)] text-[12px] font-bold uppercase tracking-[0.06em] text-white shadow-none hover:bg-[var(--jb-orange,#e86a10)]/90 focus-visible:ring-2 focus-visible:ring-[var(--jb-orange,#e86a10)]/40"
        >
          <Link href={roEstimateActionHref(roId, "payment")}>
            {stripeOnPlan ? (
              <CreditCard className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Wallet className="size-3.5 shrink-0" aria-hidden />
            )}
            {displayRemaining > 0
              ? stripeOnPlan
                ? `Collect ${formatCents(displayRemaining)}`
                : `Record ${formatCents(displayRemaining)}`
              : totalCents > 0
                ? "View payment"
                : stripeOnPlan
                  ? "Collect payment"
                  : "Record payment"}
          </Link>
        </Button>

        <div className="flex gap-1">
          <ShareMenu
            roId={roId}
            roNumber={roNumber}
            customerFirstName={customerFirstName}
            customerName={customerName}
            shopName={shopName}
            phones={sharePhones}
            email={email}
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            inspectionId={inspectionId}
            contentAlign="start"
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={ghostBtn}
                title="Send or share estimate"
              >
                <Send className="size-3 shrink-0" aria-hidden />
                Send
              </Button>
            }
          />
          <PrintMenu
            roId={roId}
            contentAlign="start"
            trigger={
              <Button type="button" variant="outline" size="sm" className={ghostBtn} title="Print">
                <Printer className="size-3 shrink-0" aria-hidden />
                Print
              </Button>
            }
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={ghostBtn}
            onClick={onDeposit}
            title={
              depositPaid
                ? "Deposit received"
                : depositPending
                  ? "Deposit pending"
                  : "Request deposit"
            }
          >
            <Wallet className="size-3 shrink-0" aria-hidden />
            {depositPaid ? "Paid" : depositPending ? "Pending" : "Deposit"}
            {(depositPending || depositPaid) && depositAmountCents != null ? (
              <span className="text-[9px] font-semibold normal-case tracking-normal tabular-nums text-[var(--jb-slate,#5b7295)]">
                {formatCents(depositAmountCents)}
              </span>
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkflowStepper({ roStatus, paid }: { roStatus: ROStatus; paid: boolean }) {
  const active = workflowStepIndex(roStatus, paid);
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Workflow step ${WORKFLOW_STEPS[active]}`}
    >
      {WORKFLOW_STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "h-1.5 w-full rounded-none",
                done || current
                  ? "bg-[var(--jb-azure,#1e7fe0)]"
                  : "bg-[var(--jb-line,#dde5ef)]",
                current && "ring-1 ring-[var(--jb-azure,#1e7fe0)]/40",
              )}
            />
            <span
              className={cn(
                "text-[10.5px] font-bold uppercase tracking-[0.04em]",
                current
                  ? "text-[var(--jb-ink,#0b1f3b)]"
                  : done
                    ? "text-[var(--jb-azure,#1e7fe0)]"
                    : "text-[var(--jb-faint,#8ca2c0)]",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatusMetaRow({
  id,
  label,
  value,
  warn,
  muted,
  title,
}: {
  id?: string;
  label: string;
  value: string;
  warn?: boolean;
  muted?: boolean;
  /** Full string on hover when value is abbreviated. */
  title?: string;
}) {
  return (
    <div
      id={id}
      className="flex items-baseline justify-between gap-2 py-[3px] text-[13px]"
    >
      <span className="shrink-0 text-[var(--jb-slate,#5b7295)]">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right font-medium tabular-nums",
          warn
            ? "font-semibold text-[var(--jb-red,#c93838)]"
            : muted
              ? "text-[var(--jb-faint,#8ca2c0)]"
              : "text-[var(--jb-ink,#0b1f3b)]",
        )}
        title={title}
      >
        {value}
      </span>
    </div>
  );
}

function StatusCard({
  roId,
  roNumber,
  roStatus,
  customerName,
  phone,
  canArchive,
  canEdit,
  approvable,
  paid,
  quickReference,
  technicians,
}: {
  roId: string;
  roNumber: number;
  roStatus: ROStatus;
  customerName: string;
  phone: string | null;
  canArchive?: boolean;
  canEdit: boolean;
  approvable: boolean;
  paid: boolean;
  quickReference: EstimateLabQuickReferenceData | null;
  technicians: StaffPick[];
}) {
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const partsCtx = useEstimateLabPartsOptional();
  const partsTechOk = usePartsTechUiEnabled();
  const saveSidebar = useRoSidebarSave(roId);
  const [roAge, setRoAge] = useState("—");
  const [techSaving, setTechSaving] = useState(false);

  useEffect(() => {
    if (!quickReference) return;
    setRoAge(fmtRelativeDays(quickReference.createdAt));
  }, [quickReference]);

  const outreachAt =
    quickReference?.authorizedAt ??
    quickReference?.estimateViewedAt ??
    quickReference?.approvalSentAt ??
    null;
  const outreachStatus =
    quickReference?.authorizedAt != null
      ? "Authorized"
      : quickReference?.estimateViewedAt != null
        ? "Viewed"
        : quickReference?.approvalSentAt != null
          ? "Sent"
          : null;
  const outreach = !quickReference
    ? "—"
    : outreachStatus && outreachAt
      ? fmtOutreach(outreachStatus, outreachAt)
      : "Not sent";
  const outreachTitle =
    outreachStatus && outreachAt
      ? fmtOutreachTitle(outreachStatus, outreachAt)
      : undefined;

  const partsTotal = quickReference
    ? quickReference.partsNeeded + quickReference.partsQuoted + quickReference.partsOrdered
    : 0;

  const techUnassigned = !quickReference?.technicianName;
  const unassignedJobs = quickReference?.unassignedJobs ?? 0;
  const techName = quickReference?.technicianName ?? "Unassigned";
  const techTitle =
    unassignedJobs > 0 ? `${techName} · ${unassignedJobs} open` : "Assign technician";
  const techWarn = techUnassigned || unassignedJobs > 0;

  async function onTechnicianChange(nextId: string) {
    setTechSaving(true);
    try {
      await saveSidebar({ technicianId: nextId || null });
    } finally {
      setTechSaving(false);
    }
  }

  return (
    <div className={cn(RAIL_CARD, "overflow-hidden")}>
      <div className="flex items-center gap-2 border-b border-[var(--jb-line,#dde5ef)] px-3.5 py-2">
        <span className="min-w-0 flex-1 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
          Status
        </span>
        <RoWorkflowDropdown
          roId={roId}
          roNumber={roNumber}
          roStatus={roStatus}
          customerName={customerName}
          phone={phone}
          canArchive={canArchive}
          triggerVariant="railChip"
          className="shrink-0"
        />
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <WorkflowStepper roStatus={roStatus} paid={paid} />

        {approvable ? (
          <Button
            type="button"
            onClick={() => setAuthorizeOpen(true)}
            className="h-9 w-full rounded-none border-0 bg-[var(--jb-azure,#1e7fe0)] text-[12px] font-bold uppercase tracking-[0.06em] text-white shadow-none hover:bg-[var(--jb-azure,#1e7fe0)]/90 focus-visible:ring-2 focus-visible:ring-[var(--jb-azure,#1e7fe0)]/40"
            title="Send estimate for approval or authorize in shop"
          >
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            Get approval
          </Button>
        ) : null}

        {quickReference ? (
          <div className="border-t border-dashed border-[var(--jb-line,#dde5ef)] pt-2">
            <StatusMetaRow label="RO age" value={roAge} />
            <StatusMetaRow
              label="Promise time"
              value={quickReference.promiseTime ? fmtDate(quickReference.promiseTime) : "—"}
              muted={!quickReference.promiseTime}
            />
            <StatusMetaRow
              id="estimate-outreach-status"
              label="Last outreach"
              value={outreach}
              title={outreachTitle}
              muted={outreach === "Not sent" || outreach === "—"}
            />
            <div className="flex items-center justify-between gap-2 py-[3px] text-[13px]">
              <span className="shrink-0 text-[var(--jb-slate,#5b7295)]">Technician</span>
              {canEdit && technicians.length > 0 ? (
                <select
                  className={cn(
                    "h-7 min-w-0 max-w-[11rem] truncate rounded-none border border-[var(--jb-line,#dde5ef)] bg-white py-0 pl-1.5 pr-1 text-right text-[12px] font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jb-azure,#1e7fe0)]/40 disabled:opacity-60",
                    techWarn
                      ? "font-semibold text-[var(--jb-red,#c93838)]"
                      : "text-[var(--jb-ink,#0b1f3b)]",
                  )}
                  value={quickReference?.technicianId ?? ""}
                  onChange={(e) => void onTechnicianChange(e.target.value)}
                  disabled={techSaving}
                  title={techTitle}
                  aria-label="Technician"
                >
                  <option value="">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={cn(
                    "min-w-0 truncate text-right font-medium tabular-nums",
                    techWarn
                      ? "font-semibold text-[var(--jb-red,#c93838)]"
                      : "text-[var(--jb-ink,#0b1f3b)]",
                  )}
                  title={unassignedJobs > 0 ? techTitle : undefined}
                >
                  {techName}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {quickReference ? (
          <div className="space-y-1.5 border-t border-dashed border-[var(--jb-line,#dde5ef)] pt-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--jb-faint,#8ca2c0)]">
              Parts pipeline
            </p>
            {partsTotal === 0 ? (
              <p className="text-[13px] text-[var(--jb-faint,#8ca2c0)]">No part lines yet</p>
            ) : (
              <div className="grid w-full grid-cols-3 gap-1">
                {(
                  [
                    {
                      label: "Needed",
                      count: quickReference.partsNeeded,
                      tone: "border-[#F0CFA4] bg-[#FDF0E2] text-[#9A5200]",
                    },
                    {
                      label: "Quoted",
                      count: quickReference.partsQuoted,
                      tone: "border-[#BCD9F5] bg-[#E7F1FD] text-[#0F5FB0]",
                    },
                    {
                      label: "Ordered",
                      count: quickReference.partsOrdered,
                      tone: "border-[#B7E2CB] bg-[#E4F5EC] text-[#137347]",
                    },
                  ] as const
                ).map((pill) => {
                  const clickable = Boolean(partsCtx) && partsTechOk;
                  const cellClass = cn(
                    "flex min-h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-none border px-1.5 py-1.5 text-[12.5px] leading-tight tabular-nums",
                    pill.tone,
                  );
                  const inner = (
                    <>
                      <span className="truncate opacity-80">{pill.label}</span>
                      <span className="shrink-0 font-bold">{pill.count}</span>
                    </>
                  );
                  return clickable ? (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => partsCtx?.openPartsMenu({ mode: "home" })}
                      className={cn(
                        cellClass,
                        "transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jb-azure,#1e7fe0)]/40",
                      )}
                      title="Open parts ordering"
                    >
                      {inner}
                    </button>
                  ) : (
                    <span key={pill.label} className={cellClass}>
                      {inner}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <AuthorizeEstimateDialog
        open={authorizeOpen}
        onOpenChange={setAuthorizeOpen}
        roId={roId}
        roNumber={roNumber}
        customerName={customerName}
        phone={phone}
      />
    </div>
  );
}

function MarginBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number | null;
  tone: "azure" | "orange";
}) {
  const width = pct != null ? Math.max(0, Math.min(100, pct)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-[var(--jb-slate,#5b7295)]">{label}</span>
        <span className="font-semibold tabular-nums text-[var(--jb-ink,#0b1f3b)]">
          {pct != null ? `${pct.toFixed(1)}%` : "—"}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-none bg-[var(--jb-surface,#f0f3f8)]">
        <div
          className={cn(
            "h-full transition-[width] duration-200",
            tone === "azure" ? "bg-[var(--jb-azure,#1e7fe0)]" : "bg-[var(--jb-orange,#e86a10)]",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function ProfitabilityCard({ profitability }: { profitability: EstimateLabProfitability }) {
  const belowGoal =
    profitability.gpGoalCents != null &&
    profitability.gpPerHourCents != null &&
    profitability.gpPerHourCents < profitability.gpGoalCents;

  return (
    <div className={cn(RAIL_CARD, "overflow-hidden")}>
      <div className="border-b border-[var(--jb-line,#dde5ef)] px-3.5 py-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
          Profitability
        </span>
      </div>
      <div className="space-y-3 px-3.5 py-3">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { label: "GP $", value: formatCents(profitability.gpCents), warn: false },
              { label: "GP %", value: `${profitability.gpPct.toFixed(1)}%`, warn: false },
              {
                label: "GP/hr",
                value:
                  profitability.gpPerHourCents != null
                    ? formatCents(profitability.gpPerHourCents)
                    : "—",
                warn: belowGoal,
              },
            ] as const
          ).map((tile) => (
            <div
              key={tile.label}
              className="rounded-none border border-[var(--jb-line,#dde5ef)] bg-[var(--jb-surface,#f0f3f8)] px-1.5 py-2 text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--jb-faint,#8ca2c0)]">
                {tile.label}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[14px] font-bold tabular-nums leading-tight",
                  tile.warn ? "text-[var(--jb-red,#c93838)]" : "text-[var(--jb-ink,#0b1f3b)]",
                )}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <MarginBar label="Labor margin" pct={profitability.laborGpPct} tone="azure" />
          <MarginBar label="Parts margin" pct={profitability.partsGpPct} tone="orange" />
        </div>

        <div className="border-t border-dashed border-[var(--jb-line,#dde5ef)] pt-2">
          <StatusMetaRow label="Total revenue" value={formatCents(profitability.totalRevenueCents)} />
          <StatusMetaRow
            label="Billable hours"
            value={profitability.billableHours > 0 ? profitability.billableHours.toFixed(2) : "—"}
            muted={profitability.billableHours <= 0}
          />
          <StatusMetaRow
            label="Effective rate"
            value={
              profitability.effectiveLaborRateCents != null
                ? formatCents(profitability.effectiveLaborRateCents)
                : "—"
            }
            muted={profitability.effectiveLaborRateCents == null}
          />
          {profitability.gpGoalCents != null ? (
            <p className="pt-0.5 text-[10px] text-[var(--jb-faint,#8ca2c0)]">
              Shop GP goal {formatCents(profitability.gpGoalCents)}/hr
              {profitability.gpPerHourCents != null
                ? belowGoal
                  ? " · below goal"
                  : " · on track"
                : ""}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TotalsCard({
  financial,
  deposit,
  depositPaid,
  depositPending,
}: {
  financial: EstimateLabFinancialSummary;
  deposit: DepositInfo | null;
  depositPaid: boolean;
  depositPending: boolean;
}) {
  const discountsCents = financial.serviceDiscountsCents + financial.roDiscountsCents;

  return (
    <div className={cn(RAIL_CARD, "overflow-hidden")}>
      <div className="border-b border-[var(--jb-line,#dde5ef)] px-3.5 py-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
          Totals
        </span>
      </div>
      <div className="px-3.5 py-3">
        <StatusMetaRow label="Labor" value={formatCents(financial.laborCents)} />
        <StatusMetaRow label="Parts" value={formatCents(financial.partsCents)} />
        {financial.shopSuppliesCents > 0 ? (
          <StatusMetaRow label="Shop supplies" value={formatCents(financial.shopSuppliesCents)} />
        ) : null}
        {financial.roFeesCents > 0 ? (
          <StatusMetaRow label="Fees" value={formatCents(financial.roFeesCents)} />
        ) : null}
        {discountsCents > 0 ? (
          <StatusMetaRow label="Discounts" value={`−${formatCents(discountsCents)}`} muted />
        ) : null}
        <StatusMetaRow label={financial.taxLabel} value={formatCents(financial.taxCents)} />
        <div className="my-1 border-t border-dashed border-[var(--jb-line,#dde5ef)]" />
        <StatusMetaRow label="Estimate total" value={formatCents(financial.estimateTotalCents)} />
        {depositPaid && deposit ? (
          <StatusMetaRow label="Deposit" value={`${formatCents(deposit.amountCents)} received`} />
        ) : depositPending && deposit ? (
          <StatusMetaRow label="Deposit" value={`${formatCents(deposit.amountCents)} pending`} />
        ) : null}
        <StatusMetaRow label="Paid to date" value={formatCents(financial.paidCents)} />
        <StatusMetaRow
          label="Balance due"
          value={formatCents(financial.remainingCents)}
          warn={financial.remainingCents > 0}
        />
      </div>
    </div>
  );
}

function EstimateLabRightRailBody(props: EstimateLabRightRailProps) {
  const {
    roId,
    roNumber,
    roStatus,
    canArchive,
    customerName,
    customerFirstName,
    phone,
    email,
    sharePhones,
    shopName,
    canEdit,
    approvable,
    financial,
    deposit,
    estimateTotalCents,
    profitability = null,
    quickReference = null,
    vehicleId = null,
    vehicleIdentitySummary = null,
    technicians = [],
    allowPaymentPreview = true,
    invoiceId,
    invoiceNumber,
    inspectionId = null,
    roFees,
    feeTemplates = [],
    jobCount,
  } = props;

  const [depositOpen, setDepositOpen] = useState(false);

  const depositPaid = deposit?.status === DepositRequestStatus.PAID;
  const depositPending = deposit?.status === DepositRequestStatus.PENDING;
  const paidInFull =
    financial.estimateTotalCents > 0 && financial.paidCents >= financial.estimateTotalCents;

  return (
    <>
      <div className="flex flex-col gap-3 p-2.5">
        <MoneyCard
          canEdit={canEdit}
          allowPreview={allowPaymentPreview}
          paidCents={financial.paidCents}
          totalCents={financial.estimateTotalCents}
          roId={roId}
          roNumber={roNumber}
          customerFirstName={customerFirstName}
          customerName={customerName}
          shopName={shopName}
          sharePhones={sharePhones}
          email={email}
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          inspectionId={inspectionId}
          onDeposit={() => setDepositOpen(true)}
          depositPending={depositPending}
          depositPaid={depositPaid}
          depositAmountCents={deposit?.amountCents}
        />

        <StatusCard
          roId={roId}
          roNumber={roNumber}
          roStatus={roStatus}
          customerName={customerName}
          phone={phone}
          canArchive={canArchive}
          canEdit={canEdit}
          approvable={approvable}
          paid={paidInFull}
          quickReference={quickReference}
          technicians={technicians}
        />

        {profitability ? <ProfitabilityCard profitability={profitability} /> : null}

        {roFees ? (
          <EstimateLabRightRailFees
            roId={roId}
            fees={roFees}
            feeTemplates={feeTemplates}
            jobCount={jobCount}
            canEdit={canEdit}
          />
        ) : null}

        {/* Always shown — sole home of the Labor/Parts/Fees/Discounts/Tax rollup
            since the sticky bottom totals bar was removed from the workspace. */}
        <TotalsCard
          financial={financial}
          deposit={deposit}
          depositPaid={depositPaid}
          depositPending={depositPending}
        />

        {vehicleId ? (
          <EstimateLabVehicleSpecsLazy
            vehicleId={vehicleId}
            excludeRoId={roId}
            canEdit={canEdit}
            identitySummary={vehicleIdentitySummary}
          />
        ) : null}
      </div>

      <EstimateDepositRequestDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        roId={roId}
        roNumber={roNumber}
        estimateTotalCents={estimateTotalCents}
        existingDeposit={deposit}
      />
    </>
  );
}

/** Fixed right rail (~302px) on desktop; sheet drawer on smaller screens. */
export function EstimateLabRightRail(props: EstimateLabRightRailProps) {
  const financial = usePreviewFinancial(props.financial);

  return (
    <>
      <EstimateLabMessagesHost
        customerId={props.customerId}
        customerName={props.customerName}
        customerPhone={props.phone}
        marketingOptIn={props.marketingOptIn}
        roId={props.roId}
      />
      <aside
        className="estimate-lab-right-rail hidden w-[302px] shrink-0 flex-col overflow-hidden border-l border-[var(--jb-line,#dde5ef)] bg-[var(--jb-surface,#f0f3f8)] lg:flex"
        style={RAIL_PALETTE_STYLE}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <EstimateLabRightRailBody {...props} financial={financial} />
        </div>
      </aside>

      <div className="shrink-0 border-t border-[var(--jb-line,#dde5ef)] bg-white px-3 py-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 rounded-none border-[var(--jb-line,#dde5ef)] text-[var(--jb-ink,#0b1f3b)]"
            >
              <PanelRight className="size-4" />
              Order summary
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="estimate-lab-right-rail flex w-full flex-col gap-0 rounded-none p-0 sm:max-w-[320px]"
            style={RAIL_PALETTE_STYLE}
          >
            <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--jb-surface,#f0f3f8)]">
              <EstimateLabRightRailBody {...props} financial={financial} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function EstimateLabRightRailLive(
  props: Omit<EstimateLabRightRailProps, "financial" | "jobs" | "profitability"> & {
    baseFinancial: EstimateLabFinancialSummary;
    baseJobs: AuthJob[];
    gpGoalCents?: number | null;
  },
) {
  const { baseFinancial, baseJobs, gpGoalCents, ...rest } = props;
  const ctx = useEstimateSelection();

  const jobs = useMemo(
    () =>
      ctx.mergedJobs.map((j) => ({
        id: j.id,
        approvedAt: j.approvedAt,
        authorized: j.authorized,
        laborLines: j.laborLines.map((l) => ({ authorized: l.authorized })),
        partLines: j.partLines.map((p) => ({ authorized: p.authorized })),
      })),
    [ctx.mergedJobs],
  );

  const laborHours = useMemo(
    () =>
      ctx.mergedJobs.reduce(
        (sum, j) =>
          sum + j.laborLines.filter((l) => l.authorized).reduce((h, l) => h + l.hours, 0),
        0,
      ),
    [ctx.mergedJobs],
  );

  const partsCostCents = useMemo(
    () =>
      ctx.mergedJobs.reduce(
        (sum, j) =>
          sum +
          j.partLines
            .filter((p) => p.authorized)
            .reduce((c, p) => c + p.costCents * p.quantity, 0),
        0,
      ),
    [ctx.mergedJobs],
  );

  const laborCostCents = useMemo(
    () =>
      ctx.mergedJobs.reduce(
        (sum, j) =>
          sum +
          j.laborLines
            .filter((l) => l.authorized)
            .reduce(
              (c, l) =>
                c + ("costCents" in l && typeof l.costCents === "number" ? l.costCents : 0),
              0,
            ),
        0,
      ),
    [ctx.mergedJobs],
  );

  const profitability = useMemo((): EstimateLabProfitability => {
    const laborCents = ctx.totals.laborCents;
    const partsCents = ctx.totals.partsCents;
    const laborGpCents = laborCents - laborCostCents;
    const partsGpCents = partsCents - partsCostCents;

    return {
      gpCents: ctx.totals.gpCents,
      gpPct: ctx.totals.gpPct,
      gpPerHourCents: laborHours > 0 ? Math.round(ctx.totals.gpCents / laborHours) : null,
      gpGoalCents,
      laborGpCents,
      laborGpPct: laborCents > 0 ? (laborGpCents / laborCents) * 100 : null,
      partsGpCents,
      partsGpPct: partsCents > 0 ? (partsGpCents / partsCents) * 100 : null,
      totalRevenueCents: ctx.totals.totalCents,
      billableHours: laborHours,
      effectiveLaborRateCents: laborHours > 0 ? Math.round(laborCents / laborHours) : null,
    };
  }, [
    ctx.totals.gpCents,
    ctx.totals.gpPct,
    ctx.totals.laborCents,
    ctx.totals.partsCents,
    ctx.totals.totalCents,
    laborHours,
    laborCostCents,
    partsCostCents,
    gpGoalCents,
  ]);

  const financial = usePreviewFinancial(
    useMemo(
      (): EstimateLabFinancialSummary => ({
        ...baseFinancial,
        laborCents: ctx.totals.laborCents,
        partsCents: ctx.totals.partsCents,
        estimateTotalCents: ctx.totals.totalCents,
        taxCents: ctx.totals.taxesCents,
        roDiscountsCents: ctx.totals.discountsCents,
        roFeesCents: ctx.totals.feesCents,
        feeLines: ctx.feeLines,
        remainingCents: Math.max(0, ctx.totals.totalCents - baseFinancial.paidCents),
      }),
      [baseFinancial, ctx.totals],
    ),
  );

  return (
    <EstimateLabRightRail
      {...rest}
      jobs={jobs.length ? jobs : baseJobs}
      financial={financial}
      profitability={profitability}
    />
  );
}
