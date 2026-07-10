"use client";

import { useJobBoardContextOptional } from "@/components/job-board/job-board-history-provider";
import { JobCardContextActions } from "@/components/job-board/job-card-context-actions";
import { cn } from "@/lib/utils";
import { customerDisplayName, formatCents } from "@/lib/format";
import {
  formatTimeInStage,
  jobCardStatusBarTone,
  type BoardColumn,
  type JobCard as JobCardData,
} from "@/lib/job-board";
import { paymentMethodShortLabel } from "@/lib/payment-display";
import {
  JOB_BOARD_CONTEXT_CHIP,
  jobBoardCardClass,
} from "@/lib/job-board-theme";

function stopCardNav(e: React.SyntheticEvent) {
  e.stopPropagation();
}

type AuthKind = "customer" | "shop" | null;

function authorizationKind(card: JobCardData): AuthKind {
  if (!card.authorizedAt || !card.approvedVia) return null;
  if (card.approvedVia === "CUSTOMER") return "customer";
  if (card.approvedVia === "SHOP") return "shop";
  return null;
}

type ContextChip = {
  label: string;
  className: string;
};

/** One primary context chip — priority matches screenshot badge semantics. */
function resolveContextChip(card: JobCardData, auth: AuthKind): ContextChip | null {
  const balanceDue = (card.invoiceBalanceCents ?? 0) > 0;

  if (card.paymentPosted && card.lastPaymentMethod) {
    return {
      label: `Paid · ${paymentMethodShortLabel(card.lastPaymentMethod)}`,
      className: JOB_BOARD_CONTEXT_CHIP.paid,
    };
  }
  if (balanceDue) {
    return { label: "Balance due", className: JOB_BOARD_CONTEXT_CHIP.alert };
  }
  if (auth === "customer") {
    return { label: "Customer approved", className: JOB_BOARD_CONTEXT_CHIP.approved };
  }
  if (auth === "shop") {
    return { label: "Shop approved", className: JOB_BOARD_CONTEXT_CHIP.approved };
  }
  if (card.approvalSentAt) {
    return { label: "Sent for approval", className: JOB_BOARD_CONTEXT_CHIP.pending };
  }
  if (card.estimateViewedAt) {
    return { label: "Viewed", className: JOB_BOARD_CONTEXT_CHIP.pending };
  }
  return null;
}

function vehicleYmm(v: JobCardData["vehicle"]): string {
  if (!v) return "No vehicle on file";
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "No vehicle on file";
}

export function JobCard({
  card,
  menu,
  selected = false,
  column,
}: {
  card: JobCardData;
  menu?: React.ReactNode;
  selected?: boolean;
  column?: BoardColumn;
}) {
  const ctx = useJobBoardContextOptional();
  const auth = authorizationKind(card);
  const context = resolveContextChip(card, auth);
  const balanceDue = (card.invoiceBalanceCents ?? 0) > 0 && !card.paymentPosted;
  const tone = jobCardStatusBarTone({ ...card, column });
  const timeInStage = formatTimeInStage(card.stageEnteredAt);
  const ymm = vehicleYmm(card.vehicle);
  const plate = card.vehicle?.plate?.trim() || null;
  const plateState = card.vehicle?.plateState?.trim() || null;
  const name = customerDisplayName(card.customer, { nameOrder: "firstLast" });

  const historyTarget = {
    customerId: card.customer.id,
    customerName: name,
    customerFirstName: card.customer.firstName,
    customerLastName: card.customer.lastName,
    customerPhone: card.customer.phone,
    marketingOptIn: card.customer.marketingOptIn,
    roId: card.id,
    roNumber: card.number,
    vehicleId: card.vehicle?.id ?? null,
    vehicle: card.vehicle,
  };

  return (
    <div className={jobBoardCardClass({ selected, auth, column, tone })}>
      <div className="job-board-card-body">
        <div className="job-board-card-header">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn("job-board-card-status-dot", `job-board-card-status-dot-${tone}`)}
              aria-hidden
            />
            <span className="job-board-card-ro-number">RO #{card.number}</span>
            {timeInStage ? (
              <span className="job-board-card-age">{timeInStage}</span>
            ) : null}
          </div>
          {menu}
        </div>

        <div className="job-board-card-customer">
          <button
            type="button"
            className="job-board-card-customer-name"
            disabled={!ctx}
            onClick={(e) => {
              stopCardNav(e);
              ctx?.openCustomerHistory(historyTarget);
            }}
            onPointerDown={stopCardNav}
          >
            {name}
          </button>
          <div className="job-board-card-vehicle-row">
            <p className="job-board-card-vehicle">{ymm}</p>
            {plate ? (
              <span className="job-board-card-plate">
                <span className="job-board-card-plate-num">{plate}</span>
                {plateState ? (
                  <span className="job-board-card-plate-state">{plateState}</span>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>

        {context ? (
          <div className="job-board-card-chip-row">
            <span className={context.className}>{context.label}</span>
          </div>
        ) : null}

        <div className="job-board-card-money">
          {balanceDue && card.invoiceBalanceCents != null ? (
            <span className="job-board-card-due">
              {formatCents(card.invoiceBalanceCents)} due
            </span>
          ) : null}
          <span
            className={cn(
              "job-board-card-total",
              balanceDue && "job-board-card-total-due",
            )}
          >
            {formatCents(card.totalCents)}
          </span>
        </div>
      </div>

      <div className="job-board-card-footer">
        <JobCardContextActions
          roId={card.id}
          roNumber={card.number}
          customerId={card.customer.id}
          customerName={name}
          customerFirstName={card.customer.firstName}
          customerLastName={card.customer.lastName}
          customerPhone={card.customer.phone}
          marketingOptIn={card.customer.marketingOptIn}
          vehicleId={card.vehicle?.id ?? null}
          vehicleLabel={ymm}
          vehicle={card.vehicle}
          unreadSmsCount={card.unreadSmsCount}
          labeled
        />
      </div>
    </div>
  );
}
