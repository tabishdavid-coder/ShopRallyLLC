"use client";

import Link from "next/link";

import { JobCardContextActions } from "@/components/job-board/job-card-context-actions";
import { useJobBoardContextOptional } from "@/components/job-board/job-board-history-provider";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/utils";
import { customerDisplayName, formatCents } from "@/lib/format";
import {
  type BoardColumn,
  type JobCard as JobCardData,
} from "@/lib/job-board";
import { paymentMethodShortLabel } from "@/lib/payment-display";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import {
  JOB_BOARD_CARD_STATUS_PILL,
  JOB_BOARD_CONTEXT_CHIP,
  jobBoardCardClass,
  type JobBoardCardStatusPillKey,
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

type ContextCue = {
  label: string;
  className: string;
};

/** Sparse secondary cue — never competes with status / customer / money. */
function resolveContextCue(card: JobCardData, auth: AuthKind): ContextCue | null {
  const balanceDue = (card.invoiceBalanceCents ?? 0) > 0;

  // Unread is signaled on the Chat icon badge — skip a competing text cue.
  if (card.paymentPosted && card.lastPaymentMethod) {
    return {
      label: `Paid · ${paymentMethodShortLabel(card.lastPaymentMethod)}`,
      className: JOB_BOARD_CONTEXT_CHIP.paid,
    };
  }
  if (balanceDue) return null;
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

function resolveStatusPill(
  card: JobCardData,
  column?: BoardColumn,
): { key: JobBoardCardStatusPillKey; label: string; className: string } {
  const balanceDue = (card.invoiceBalanceCents ?? 0) > 0 && !card.paymentPosted;

  if (card.paymentPosted) {
    return { key: "paid", ...JOB_BOARD_CARD_STATUS_PILL.paid };
  }
  if (balanceDue) {
    return { key: "balanceDue", ...JOB_BOARD_CARD_STATUS_PILL.balanceDue };
  }
  if (column === "completed" || card.status === "COMPLETED" || card.status === "INVOICED") {
    return { key: "completed", ...JOB_BOARD_CARD_STATUS_PILL.completed };
  }
  if (
    column === "workInProgress" ||
    card.status === "IN_PROGRESS" ||
    card.status === "APPROVED"
  ) {
    if (card.status === "APPROVED" && column !== "workInProgress") {
      return { key: "approved", ...JOB_BOARD_CARD_STATUS_PILL.approved };
    }
    return { key: "inProgress", ...JOB_BOARD_CARD_STATUS_PILL.inProgress };
  }
  return { key: "notStarted", ...JOB_BOARD_CARD_STATUS_PILL.notStarted };
}

function vehicleLine(v: JobCardData["vehicle"]): string {
  if (!v) return "No vehicle on file";
  const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const plate = v.plate?.trim();
  const state = v.plateState?.trim();
  if (!ymm && !plate) return "No vehicle on file";
  if (plate) {
    const platePart = state ? `${plate} ${state}` : plate;
    return ymm ? `${ymm} — ${platePart}` : platePart;
  }
  return ymm || "No vehicle on file";
}

export function JobCard({
  card,
  menu,
  selected = false,
  column,
  openHref,
}: {
  card: JobCardData;
  menu?: React.ReactNode;
  selected?: boolean;
  column?: BoardColumn;
  /** Override RO open href (workflow board). */
  openHref?: string;
}) {
  const ctx = useJobBoardContextOptional();
  const auth = authorizationKind(card);
  const cue = resolveContextCue(card, auth);
  const statusPill = resolveStatusPill(card, column);
  const balanceDue = (card.invoiceBalanceCents ?? 0) > 0 && !card.paymentPosted;
  const vehicle = vehicleLine(card.vehicle);
  const name = customerDisplayName(card.customer, { nameOrder: "firstLast" });
  const phone = card.customer.phone?.trim() || null;
  const href = openHref ?? defaultRoOpenHref(card.id);

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
    <div className={jobBoardCardClass({ selected, auth, column })}>
      {/* Top: status · RO# + created + ⋮ */}
      <div className="job-board-card-header">
        <span className={statusPill.className}>{statusPill.label}</span>
        <div className="job-board-card-meta">
          <Link
            href={href}
            className="job-board-card-ro-number"
            onClick={stopCardNav}
            onPointerDown={stopCardNav}
          >
            RO#{card.number}
          </Link>
          <span className="job-board-card-created">
            <RelativeTime date={card.createdAt} prefix="Created " />
          </span>
          {menu}
        </div>
      </div>

      {/* Who + vehicle */}
      <div className="job-board-card-identity">
        <p className="job-board-card-customer-line">
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
          {phone ? <span className="job-board-card-phone">{phone}</span> : null}
        </p>
        <p className="job-board-card-vehicle">{vehicle}</p>
      </div>

      {/* Cue (if any) above; quiet actions + money share one baseline */}
      {cue ? (
        <span className={cn("job-board-card-cue", cue.className)}>{cue.label}</span>
      ) : null}
      <div className="job-board-card-footer-row">
        <JobCardContextActions
          className="job-board-card-inline-actions"
          iconOnly
          roId={card.id}
          roNumber={card.number}
          customerId={card.customer.id}
          customerName={name}
          customerFirstName={card.customer.firstName}
          customerLastName={card.customer.lastName}
          customerPhone={card.customer.phone}
          marketingOptIn={card.customer.marketingOptIn}
          vehicleId={card.vehicle?.id ?? null}
          vehicleLabel={vehicle}
          vehicle={card.vehicle}
          unreadSmsCount={card.unreadSmsCount}
        />
        <div className="job-board-card-money">
          <span className="job-board-card-total">{formatCents(card.totalCents)}</span>
          {balanceDue && card.invoiceBalanceCents != null ? (
            <span className="job-board-card-due-label">
              Balance Due {formatCents(card.invoiceBalanceCents)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
