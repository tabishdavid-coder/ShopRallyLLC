"use client";

/**
 * Order summary right rail — Tekmetric-first RO context + profitability focus.
 * IA: agents/EstimateBuilding/RIGHT-RAIL-IA.md
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  PanelRight,
  Printer,
  Send,
  Wallet,
} from "lucide-react";

import { EstimateLabMessagesHost } from "@/components/estimate-building/estimate-lab-messages-host";
import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import { EstimateLabVehicleSpecsSection } from "@/components/estimate-building/estimate-lab-vehicle-specs-section";

import { EstimateDepositRequestDialog } from "@/components/estimate-building/estimate-deposit-request-dialog";
import {
  EstimateLabQuickReference,
  type EstimateLabQuickReferenceData,
} from "@/components/estimate-building/estimate-lab-quick-reference";
import {
  effectiveLabPaidCents,
  useEstimateLabDisplay,
} from "@/components/estimate-building/estimate-lab-display-context";
import { EstimateLabPaymentStatusMenu, PaymentAmounts } from "@/components/estimate-building/estimate-lab-payment-status-menu";
import { PrintMenu } from "@/components/repair-order/print-menu";
import { RoWorkflowDropdown } from "@/components/repair-order/ro-workflow-dropdown";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import { ShareEstimateDialog } from "@/components/repair-order/share-estimate-dialog";
import { useEstimateSelection } from "@/components/repair-order/estimate-selection-context";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DepositRequestStatus } from "@/generated/prisma";
import type { ROStatus } from "@/generated/prisma";
import { formatCents } from "@/lib/format";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { jobAuthState } from "@/lib/ro-totals";
import { cn } from "@/lib/utils";

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
  taxCents: number;
  taxLabel: string;
  estimateTotalCents: number;
  paidCents: number;
  remainingCents: number;
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
  vehicleSpecs?: EstimateLabVehicleSpecsBundle | null;
  /** Design-mode-only "preview a payment status" override. Defaults to true; set false on production ROs so the strip always reflects real invoice data. */
  allowPaymentPreview?: boolean;
};

function computeAuthCounts(jobs: AuthJob[]) {
  let pendingApproval = 0;
  let approved = 0;
  let declined = 0;

  for (const job of jobs) {
    if (job.approvedAt) {
      approved++;
      continue;
    }
    const state = jobAuthState({
      laborLines: job.laborLines.map((l) => ({ authorized: l.authorized !== false })),
      partLines: job.partLines.map((p) => ({ authorized: p.authorized !== false })),
    });
    if (state === true) approved++;
    else if (state === "indeterminate") pendingApproval++;
    else if (
      job.laborLines.some((l) => l.authorized === false) ||
      job.partLines.some((p) => p.authorized === false)
    ) {
      declined++;
    } else pendingApproval++;
  }

  return { pendingApproval, approved, declined };
}

function PaymentStatusStrip({
  canEdit,
  allowPreview = true,
  actualPaidCents,
  totalCents,
  className,
}: {
  canEdit: boolean;
  allowPreview?: boolean;
  actualPaidCents: number;
  totalCents: number;
  className?: string;
}) {
  const { paymentPreview } = useEstimateLabDisplay();
  const paidCents = allowPreview
    ? effectiveLabPaidCents(paymentPreview, actualPaidCents, totalCents)
    : actualPaidCents;
  const isPreviewing = allowPreview && paymentPreview != null;

  return (
    <div className={cn("border-b border-brand-light/25 bg-white px-3 py-2.5", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <EstimateLabPaymentStatusMenu
          canEdit={canEdit}
          allowPreview={allowPreview}
          paidCents={paidCents}
          totalCents={totalCents}
          inline
        />
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <PaymentAmounts paidCents={paidCents} totalCents={totalCents} />
          {isPreviewing ? (
            <span
              className="shrink-0 rounded-sm bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-amber-700"
              title="Design-mode preview — not written to the invoice"
            >
              Preview
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function WorkflowStatusStrip({
  roId,
  roNumber,
  roStatus,
  customerName,
  phone,
  canArchive = false,
}: {
  roId: string;
  roNumber: number;
  roStatus: ROStatus;
  customerName: string;
  phone: string | null;
  canArchive?: boolean;
}) {
  return (
    <div className="border-b border-border bg-white px-3 py-2.5">
      <RoWorkflowDropdown
        roId={roId}
        roNumber={roNumber}
        roStatus={roStatus}
        customerName={customerName}
        phone={phone}
        canArchive={canArchive}
        className="w-full justify-between"
        triggerVariant="rail"
      />
    </div>
  );
}

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

function SummaryRow({
  label,
  value,
  emphasis,
  muted,
  warn,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[13px]">
      <span className={cn("text-muted-foreground", muted && "text-muted-foreground/80")}>{label}</span>
      <span
        className={cn(
          "min-w-0 truncate tabular-nums font-medium text-foreground",
          emphasis && "font-bold text-brand-navy",
          warn && "font-semibold text-brand-red",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function AuthStatChip({
  label,
  count,
  dotClass,
}: {
  label: string;
  count: number;
  dotClass: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className={cn("size-1.5 shrink-0 rounded-full", dotClass)} aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-brand-navy">{count}</span>
    </span>
  );
}

function ApprovalStatusStrip({
  pending,
  approved,
  declined,
  className,
}: {
  pending: number;
  approved: number;
  declined: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5 border-b border-brand-light/25 bg-white px-3 py-2.5", className)}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] leading-none">
        <AuthStatChip label="Pending" count={pending} dotClass="bg-amber-400" />
        <span className="text-muted-foreground/35" aria-hidden>
          ·
        </span>
        <AuthStatChip label="Approved" count={approved} dotClass="bg-emerald-500" />
        <span className="text-muted-foreground/35" aria-hidden>
          ·
        </span>
        <AuthStatChip label="Declined" count={declined} dotClass="bg-brand-red" />
      </div>
      <ApprovalProgressBar pending={pending} approved={approved} declined={declined} />
    </div>
  );
}

function ApprovalProgressBar({
  pending,
  approved,
  declined,
}: {
  pending: number;
  approved: number;
  declined: number;
}) {
  const total = pending + approved + declined;
  if (total === 0) return null;

  const approvedPct = (approved / total) * 100;
  const pendingPct = (pending / total) * 100;
  const declinedPct = (declined / total) * 100;

  return (
    <div
      className="flex h-1 overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={`${approved} approved, ${pending} pending, ${declined} declined of ${total} jobs`}
    >
      {approvedPct > 0 ? (
        <div className="bg-emerald-500 transition-[width] duration-200" style={{ width: `${approvedPct}%` }} />
      ) : null}
      {pendingPct > 0 ? (
        <div className="bg-amber-400 transition-[width] duration-200" style={{ width: `${pendingPct}%` }} />
      ) : null}
      {declinedPct > 0 ? (
        <div className="bg-brand-red transition-[width] duration-200" style={{ width: `${declinedPct}%` }} />
      ) : null}
    </div>
  );
}

function OrderSummaryAccordion({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
  contentClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  contentClassName?: string;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-b border-border last:border-0">
      <CollapsibleTrigger className="ro-sidebar-accordion-trigger group flex w-full items-center gap-2 bg-slate-50/80 px-3 py-2.5 text-left text-[13px] font-semibold tracking-tight text-brand-navy">
        <Icon className="ro-sidebar-accordion-icon size-4 shrink-0 text-brand-navy/70" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:hidden" />
        <ChevronDown className="hidden size-4 shrink-0 text-brand-navy group-data-[state=open]:block" />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "ro-sidebar-accordion-content overflow-hidden bg-white px-3 py-3",
          contentClassName,
        )}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function EstimateLabActionsStrip({
  roId,
  onShare,
  onDeposit,
  depositPending,
  depositPaid,
  depositAmountCents,
}: {
  roId: string;
  onShare: () => void;
  onDeposit: () => void;
  depositPending: boolean;
  depositPaid: boolean;
  depositAmountCents?: number;
}) {
  const actionClass =
    "flex h-auto min-h-0 flex-col gap-0.5 rounded-md border border-brand-orange/90 bg-brand-orange px-1 py-1.5 text-[10px] font-semibold leading-none text-white shadow-sm hover:bg-brand-orange/90 active:bg-brand-orange/85 focus-visible:ring-2 focus-visible:ring-brand-orange/40 focus-visible:ring-offset-1 disabled:opacity-50 [&_svg]:text-white";

  return (
    <div className="shrink-0 border-b border-border bg-white px-2 py-2">
      <div className="grid grid-cols-4 gap-1">
        <Button
          type="button"
          variant="default"
          size="sm"
          className={actionClass}
          onClick={onShare}
          title="Send or share estimate"
        >
          <Send className="size-3.5 shrink-0" aria-hidden />
          Send
        </Button>
        <PrintMenu
          roId={roId}
          contentAlign="start"
          trigger={
            <Button type="button" variant="default" size="sm" className={actionClass} title="Print">
              <Printer className="size-3.5 shrink-0" aria-hidden />
              Print
            </Button>
          }
        />
        <Button
          type="button"
          variant="default"
          size="sm"
          className={actionClass}
          onClick={onDeposit}
          title={
            depositPaid
              ? "Deposit received"
              : depositPending
                ? "Deposit pending"
                : "Request deposit"
          }
        >
          <Wallet className="size-3.5 shrink-0" aria-hidden />
          {depositPaid ? "Paid" : depositPending ? "Pending" : "Deposit"}
          {(depositPending || depositPaid) && depositAmountCents != null ? (
            <span className="text-[9px] font-normal tabular-nums text-white/80">
              {formatCents(depositAmountCents)}
            </span>
          ) : null}
        </Button>
        <Button type="button" variant="default" size="sm" className={actionClass} asChild title="Collect payment">
          <Link href={roEstimateActionHref(roId, "payment")}>
            <CreditCard className="size-3.5 shrink-0" aria-hidden />
            Pay
          </Link>
        </Button>
      </div>
    </div>
  );
}

function VehicleSpecsRailSection({
  vehicleSpecs,
  canEdit,
}: {
  vehicleSpecs: EstimateLabVehicleSpecsBundle;
  canEdit: boolean;
}) {
  const ctx = useEstimateLabContextDrawerOptional();

  useEffect(() => {
    if (!ctx) return;
    ctx.registerOpenVehicleSpecs(() => {
      requestAnimationFrame(() => {
        document.getElementById("estimate-lab-vehicle-specs")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    });
    return () => ctx.registerOpenVehicleSpecs(null);
  }, [ctx]);

  return (
    <div id="estimate-lab-vehicle-specs" className="border-b border-border last:border-0 bg-white">
      <EstimateLabVehicleSpecsSection data={vehicleSpecs} canEdit={canEdit} />
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
    shopName,
    canEdit,
    financial,
    deposit,
    estimateTotalCents,
    profitability = null,
    quickReference = null,
    vehicleSpecs = null,
  } = props;

  const [depositOpen, setDepositOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const feesCents = financial.serviceFeesCents + financial.roFeesCents + financial.shopSuppliesCents;
  const discountsCents = financial.serviceDiscountsCents + financial.roDiscountsCents;
  const showTotals = !profitability;

  const depositPaid = deposit?.status === DepositRequestStatus.PAID;
  const depositPending = deposit?.status === DepositRequestStatus.PENDING;

  const sharePhones = phone ? [{ label: "Primary", value: phone }] : [];

  return (
    <>
      <EstimateLabActionsStrip
        roId={roId}
        onShare={() => setShareOpen(true)}
        onDeposit={() => setDepositOpen(true)}
        depositPending={depositPending}
        depositPaid={depositPaid}
        depositAmountCents={deposit?.amountCents}
      />

      {profitability ? (
        <OrderSummaryAccordion icon={BarChart3} title="Profitability">
          <div className="space-y-1">
            <SummaryRow label="Gross profit" value={formatCents(profitability.gpCents)} emphasis />
            <SummaryRow label="GP %" value={`${profitability.gpPct.toFixed(1)}%`} />
            <SummaryRow
              label="GP / hr"
              value={
                profitability.gpPerHourCents != null
                  ? formatCents(profitability.gpPerHourCents)
                  : "—"
              }
              warn={
                profitability.gpGoalCents != null &&
                profitability.gpPerHourCents != null &&
                profitability.gpPerHourCents < profitability.gpGoalCents
              }
            />
            <div className="my-1 border-t border-dashed border-border" />
            <SummaryRow
              label="Labor margin"
              value={
                profitability.laborGpPct != null
                  ? `${formatCents(profitability.laborGpCents)} (${profitability.laborGpPct.toFixed(1)}%)`
                  : formatCents(profitability.laborGpCents)
              }
            />
            <SummaryRow
              label="Parts margin"
              value={
                profitability.partsGpPct != null
                  ? `${formatCents(profitability.partsGpCents)} (${profitability.partsGpPct.toFixed(1)}%)`
                  : formatCents(profitability.partsGpCents)
              }
            />
            <SummaryRow label="Total revenue" value={formatCents(profitability.totalRevenueCents)} />
            <SummaryRow
              label="Billable hrs"
              value={profitability.billableHours > 0 ? profitability.billableHours.toFixed(2) : "—"}
            />
            <SummaryRow
              label="Labor rate"
              value={
                profitability.effectiveLaborRateCents != null
                  ? formatCents(profitability.effectiveLaborRateCents)
                  : "—"
              }
              muted
            />
            {profitability.gpGoalCents != null ? (
              <p className="pt-0.5 text-[10px] text-muted-foreground">
                Shop GP goal {formatCents(profitability.gpGoalCents)}/hr
                {profitability.gpPerHourCents != null &&
                profitability.gpPerHourCents < profitability.gpGoalCents
                  ? " · below goal"
                  : profitability.gpPerHourCents != null
                    ? " · on track"
                    : ""}
              </p>
            ) : null}
          </div>
        </OrderSummaryAccordion>
      ) : null}

      <WorkflowStatusStrip
        roId={roId}
        roNumber={roNumber}
        roStatus={roStatus}
        customerName={customerName}
        phone={phone}
        canArchive={canArchive}
      />

      {showTotals ? (
        <OrderSummaryAccordion icon={Wallet} title="Totals">
          <div className="space-y-1.5">
            <SummaryRow label="Labor" value={formatCents(financial.laborCents)} />
            <SummaryRow label="Parts" value={formatCents(financial.partsCents)} />
            {feesCents > 0 ? <SummaryRow label="Fees" value={formatCents(feesCents)} /> : null}
            {discountsCents > 0 ? (
              <SummaryRow label="Discounts" value={`−${formatCents(discountsCents)}`} muted />
            ) : null}
            <SummaryRow label={financial.taxLabel} value={formatCents(financial.taxCents)} />
            <div className="my-1 border-t border-dashed border-border" />
            <SummaryRow label="Estimate total" value={formatCents(financial.estimateTotalCents)} emphasis />
            {depositPaid && deposit ? (
              <SummaryRow label="Deposit" value={`${formatCents(deposit.amountCents)} received`} />
            ) : depositPending && deposit ? (
              <SummaryRow label="Deposit" value={`${formatCents(deposit.amountCents)} pending`} />
            ) : null}
            <SummaryRow label="Paid to date" value={formatCents(financial.paidCents)} />
            <SummaryRow
              label="Balance due"
              value={formatCents(financial.remainingCents)}
              emphasis={financial.remainingCents > 0}
            />
          </div>
        </OrderSummaryAccordion>
      ) : null}

      {vehicleSpecs ? (
        <VehicleSpecsRailSection vehicleSpecs={vehicleSpecs} canEdit={canEdit} />
      ) : null}

      {quickReference ? (
        <EstimateLabQuickReference data={quickReference} hideVehicleSection={Boolean(vehicleSpecs)} />
      ) : null}

      <EstimateDepositRequestDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        roId={roId}
        roNumber={roNumber}
        estimateTotalCents={estimateTotalCents}
        existingDeposit={deposit}
      />

      <ShareEstimateDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        roId={roId}
        roNumber={roNumber}
        customerFirstName={customerFirstName}
        shopName={shopName}
        phones={sharePhones}
        email={email}
      />
    </>
  );
}

/** Fixed right rail (~300px) on desktop; sheet drawer on smaller screens. */
export function EstimateLabRightRail(props: EstimateLabRightRailProps) {
  const authCounts = useMemo(() => computeAuthCounts(props.jobs), [props.jobs]);
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
      <aside className="hidden w-[300px] shrink-0 flex-col overflow-hidden border-l border-brand-light/30 bg-slate-50/50 lg:flex">
        <ApprovalStatusStrip
          pending={authCounts.pendingApproval}
          approved={authCounts.approved}
          declined={authCounts.declined}
        />
        <PaymentStatusStrip
          canEdit={props.canEdit}
          allowPreview={props.allowPaymentPreview}
          actualPaidCents={props.financial.paidCents}
          totalCents={financial.estimateTotalCents}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <EstimateLabRightRailBody {...props} financial={financial} />
        </div>
      </aside>

      <div className="shrink-0 border-t border-border bg-white px-3 py-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 border-brand-navy/20 text-brand-navy"
            >
              <PanelRight className="size-4" />
              Order summary
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[320px]">
            <ApprovalStatusStrip
              pending={authCounts.pendingApproval}
              approved={authCounts.approved}
              declined={authCounts.declined}
              className="shrink-0"
            />
            <PaymentStatusStrip
              canEdit={props.canEdit}
              allowPreview={props.allowPaymentPreview}
              actualPaidCents={props.financial.paidCents}
              totalCents={financial.estimateTotalCents}
              className="shrink-0"
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
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
