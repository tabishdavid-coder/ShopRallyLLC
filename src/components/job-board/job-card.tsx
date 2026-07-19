"use client";

import Link from "next/link";
import { Eye, Send } from "lucide-react";

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
  jobBoardProgressStep,
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
  if (card.estimateViewedAt) {
    return { key: "viewed", ...JOB_BOARD_CARD_STATUS_PILL.viewed };
  }
  if (card.approvalSentAt) {
    return { key: "sent", ...JOB_BOARD_CARD_STATUS_PILL.sent };
  }
  return { key: "notStarted", ...JOB_BOARD_CARD_STATUS_PILL.notStarted };
}

function vehicleYmm(v: JobCardData["vehicle"]): string {
  if (!v) return "No vehicle on file";
  const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
  return ymm || "No vehicle on file";
}

function plateLabel(v: JobCardData["vehicle"]): string | null {
  if (!v?.plate?.trim()) return null;
  const plate = v.plate.trim();
  const state = v.plateState?.trim();
  return state ? `${plate} ${state}` : plate;
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
  const ymm = vehicleYmm(card.vehicle);
  const plate = plateLabel(card.vehicle);
  const vehicleFull = plate ? `${ymm} — ${plate}` : ymm;
  const name = customerDisplayName(card.customer, { nameOrder: "firstLast" });
  const phone = card.customer.phone?.trim() || null;
  const href = openHref ?? defaultRoOpenHref(card.id);
  const progress = jobBoardProgressStep(column);
  const sent = Boolean(card.approvalSentAt);
  const viewed = Boolean(card.estimateViewedAt);

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
      {/* Top: RO# + sent/viewed · created · stage dot · menu */}
      <div className="job-board-card-header">
        <div className="job-board-card-meta">
          <Link
            href={href}
            className="job-board-card-ro-number"
            onClick={stopCardNav}
            onPointerDown={stopCardNav}
          >
            RO#{card.number}
          </Link>
          {sent ? (
            <span className="job-board-card-signal" title="Estimate sent" aria-label="Estimate sent">
              <Send className="size-3" aria-hidden />
            </span>
          ) : null}
          {viewed ? (
            <span
              className="job-board-card-signal"
              title="Estimate viewed"
              aria-label="Estimate viewed"
            >
              <Eye className="size-3" aria-hidden />
            </span>
          ) : null}
          <span className="job-board-card-created">
            <RelativeTime date={card.createdAt} prefix="Created " />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="job-board-card-dot" aria-hidden />
          {menu}
        </div>
      </div>

      {/* Who + vehicle + plate pill */}
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
        <p className="job-board-card-vehicle">{ymm}</p>
        {plate ? <span className="job-board-card-plate">{plate}</span> : null}
      </div>

      {/* Soft status pill + optional cue */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={statusPill.className}>{statusPill.label}</span>
        {cue ? (
          <span className={cn("job-board-card-cue", cue.className)}>{cue.label}</span>
        ) : null}
      </div>

      {/* Progress chevrons (3 ShopRally stages) + actions + money */}
      <div className="job-board-card-footer-row">
        <div className="flex min-w-0 items-center gap-2">
          <div className="job-board-card-progress" aria-hidden>
            {[0, 1, 2].map((step) => (
              <span
                key={step}
                className={cn(
                  "job-board-card-chevron",
                  step <= progress && "job-board-card-chevron-on",
                )}
              />
            ))}
          </div>
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
            vehicleLabel={vehicleFull}
            vehicle={card.vehicle}
            unreadSmsCount={card.unreadSmsCount}
          />
        </div>
        <div className="job-board-card-money">
          <span className="job-board-card-total">{formatCents(card.totalCents)}</span>
          {balanceDue && card.invoiceBalanceCents != null ? (
            <span className="job-board-card-due-label">
              {formatCents(card.invoiceBalanceCents)} due
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
