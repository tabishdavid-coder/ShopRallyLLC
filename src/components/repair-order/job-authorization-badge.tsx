"use client";

import { Check, Clock, Minus } from "lucide-react";

import {
  ApprovalSignatureBadge,
  type ApprovalSignatureInfo,
} from "@/components/repair-order/approval-signature-panel";
import { cn } from "@/lib/utils";

export function formatJobAuthTimestamp(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type JobAuthBadgeStatus =
  | { kind: "approved"; at: Date | string | null }
  | { kind: "declined" }
  | { kind: "deferred" }
  | { kind: "pending" }
  | { kind: "partial" }
  | { kind: "not_authorized" };

/** Derive per-job authorization pill from job + RO context — no invented timestamps. */
export function resolveJobAuthBadgeStatus(input: {
  authorized: boolean;
  approvedAt?: Date | string | null;
  recommended?: boolean;
  authState: boolean | "indeterminate";
  roAuthorizedAt?: Date | string | null;
  approvalSentAt?: Date | string | null;
}): JobAuthBadgeStatus {
  if (input.authorized) {
    return { kind: "approved", at: input.approvedAt ?? null };
  }
  if (input.authState === "indeterminate") {
    return { kind: "partial" };
  }
  if (input.roAuthorizedAt) {
    return input.recommended ? { kind: "deferred" } : { kind: "declined" };
  }
  if (input.approvalSentAt) {
    return { kind: "pending" };
  }
  return { kind: "not_authorized" };
}

const pillBase =
  "inline-flex shrink-0 items-center gap-1 rounded-none px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

const STATUS_STYLES: Record<
  Exclude<JobAuthBadgeStatus["kind"], "approved">,
  { className: string; label: string; Icon?: typeof Check }
> = {
  declined: {
    className: "border border-brand-red/35 bg-brand-red/10 text-brand-red",
    label: "Declined",
    Icon: Minus,
  },
  deferred: {
    className: "border border-[#CBD8E7] bg-[#F3F8FE] text-[#5B7295]",
    label: "Declined",
  },
  pending: {
    className: "border border-amber-400/60 bg-amber-50 text-amber-900",
    label: "Pending",
    Icon: Clock,
  },
  partial: {
    className: "border border-[#E86A10]/45 bg-[#FFF4EC] text-[#C0560A]",
    label: "Partial",
  },
  not_authorized: {
    className: "border border-amber-400/60 bg-amber-50 text-amber-900",
    label: "Not authorized",
  },
};

export function JobAuthorizationBadge({
  authorized,
  approvedAt = null,
  recommended = false,
  authState,
  roAuthorizedAt = null,
  approvalSentAt = null,
  approvalSignature = null,
  customerApproved = false,
  className,
}: {
  authorized: boolean;
  approvedAt?: Date | string | null;
  recommended?: boolean;
  authState: boolean | "indeterminate";
  roAuthorizedAt?: Date | string | null;
  approvalSentAt?: Date | string | null;
  approvalSignature?: ApprovalSignatureInfo | null;
  /** True when this job was customer-approved (`approvedVia=CUSTOMER` + job.approvedAt). */
  customerApproved?: boolean;
  className?: string;
}) {
  const status = resolveJobAuthBadgeStatus({
    authorized,
    approvedAt,
    recommended,
    authState,
    roAuthorizedAt,
    approvalSentAt,
  });

  if (status.kind === "approved") {
    if (customerApproved && approvalSignature) {
      return (
        <ApprovalSignatureBadge
          info={approvalSignature}
          className={className}
          label={
            status.at
              ? `Approved · ${formatJobAuthTimestamp(status.at)}`
              : "Approved"
          }
        />
      );
    }

    return (
      <span
        className={cn(
          pillBase,
          "border border-[#B7E2CB] bg-[#E4F5EC] text-[#137347]",
          className,
        )}
        role="status"
        title={
          status.at
            ? `Approved ${formatJobAuthTimestamp(status.at)}`
            : "Approved"
        }
      >
        <Check className="size-3" aria-hidden />
        Approved
        {status.at ? <> · {formatJobAuthTimestamp(status.at)}</> : null}
      </span>
    );
  }

  const meta = STATUS_STYLES[status.kind];
  const Icon = meta.Icon;

  return (
    <span
      className={cn(pillBase, meta.className, className)}
      role="status"
      title={meta.label}
    >
      {Icon ? <Icon className="size-3" aria-hidden /> : null}
      {meta.label}
    </span>
  );
}
