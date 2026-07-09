import Link from "next/link";
import {
  Banknote,
  ClipboardCheck,
  CreditCard,
  Eye,
  Landmark,
  Send,
} from "lucide-react";

import { JobCardContextActions } from "@/components/job-board/job-card-context-actions";
import { cn } from "@/lib/utils";
import { customerDisplayName, formatCents } from "@/lib/format";
import { type BoardColumn, type JobCard as JobCardData } from "@/lib/job-board";
import { paymentMethodShortLabel } from "@/lib/payment-display";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  JOB_BOARD_CONTEXT_CHIP,
  jobBoardCardClass,
} from "@/lib/job-board-theme";

function paymentMethodIcon(method: string | null) {
  switch (method) {
    case "CARD":
      return CreditCard;
    case "CASH":
      return Banknote;
    case "CHECK":
      return Landmark;
    default:
      return Banknote;
  }
}

function vehicleLine(v: JobCardData["vehicle"]): string {
  if (!v) return "No vehicle on file";
  const base = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const plate = v.plate ? ` · ${v.plate}${v.plateState ? ` ${v.plateState}` : ""}` : "";
  return `${base}${plate}`;
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
  icon?: React.ComponentType<{ className?: string }>;
};

/** One primary context chip — avoids competing badge rows (Garage360-style density). */
function resolveContextChip(card: JobCardData, auth: AuthKind): ContextChip | null {
  const balanceDue = (card.invoiceBalanceCents ?? 0) > 0;

  if (card.paymentPosted && card.lastPaymentMethod) {
    const PaymentIcon = paymentMethodIcon(card.lastPaymentMethod);
    return {
      label: `Paid · ${paymentMethodShortLabel(card.lastPaymentMethod)}`,
      className: JOB_BOARD_CONTEXT_CHIP.paid,
      icon: PaymentIcon,
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
  if (card.estimateViewedAt) {
    return { label: "Viewed", className: JOB_BOARD_CONTEXT_CHIP.pending, icon: Eye };
  }
  if (card.approvalSentAt) {
    return { label: "Sent for approval", className: JOB_BOARD_CONTEXT_CHIP.pending, icon: Send };
  }
  return null;
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
  const auth = authorizationKind(card);
  const context = resolveContextChip(card, auth);
  const balanceDue = (card.invoiceBalanceCents ?? 0) > 0;
  const ContextIcon = context?.icon;

  return (
    <div className={jobBoardCardClass({ selected, auth, column })}>
      <div className="job-board-card-header">
        <div className="min-w-0 truncate">
          <span className="text-xs font-bold tabular-nums tracking-tight text-brand-navy">
            RO #{card.number}
          </span>
          <span className="mx-1 text-muted-foreground/40" aria-hidden>
            ·
          </span>
          <span className="text-[11px] text-muted-foreground">
            <RelativeTime date={card.createdAt} />
          </span>
        </div>
        {menu}
      </div>

      {context ? (
        <div className="mt-2">
          <span className={context.className}>
            {ContextIcon ? <ContextIcon className="size-3 shrink-0" aria-hidden /> : null}
            {context.label}
          </span>
        </div>
      ) : null}

      <div className="mt-2 min-w-0 flex-1 space-y-0.5">
        <Link
          href={`/customers?customer=${card.customer.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block truncate text-[14px] font-semibold leading-snug text-foreground hover:text-brand-navy hover:underline"
        >
          {customerDisplayName(card.customer)}
        </Link>
        <p className="truncate text-xs leading-snug text-muted-foreground">{vehicleLine(card.vehicle)}</p>
      </div>

      <div className="job-board-card-footer">
        <div className="flex min-w-0 items-center gap-0.5">
          <JobCardContextActions
            roId={card.id}
            roNumber={card.number}
            customerId={card.customer.id}
            customerName={customerDisplayName(card.customer)}
            customerPhone={card.customer.phone}
            marketingOptIn={card.customer.marketingOptIn}
            vehicleId={card.vehicle?.id ?? null}
            vehicleLabel={vehicleLine(card.vehicle)}
            iconOnly
          />
          {card.hasInspection ? (
            <span
              className="job-board-card-icon-hint text-emerald-700"
              title="Digital vehicle inspection"
            >
              <ClipboardCheck className="size-3.5" aria-hidden />
              <span className="sr-only">DVI on file</span>
            </span>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <div
            className={cn(
              "text-sm font-bold tabular-nums tracking-tight",
              balanceDue && !card.paymentPosted ? "text-brand-red" : "text-brand-navy",
            )}
          >
            {formatCents(card.totalCents)}
          </div>
          {balanceDue && card.invoiceBalanceCents != null && !card.paymentPosted ? (
            <p className="text-[10px] font-medium tabular-nums text-brand-red/80">
              {formatCents(card.invoiceBalanceCents)} due
            </p>
          ) : card.lastPaymentAt && card.paymentPosted ? (
            <p className="text-[10px] text-muted-foreground">
              <RelativeTime date={card.lastPaymentAt} />
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
