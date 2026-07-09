"use client";

import type { ServiceProfileItem, ServiceTermStatus } from "@/lib/maintenance-service-profile";
import {
  statusBadgeClass,
  statusLabel,
  termProgressSummary,
} from "@/lib/maintenance-service-profile";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, Info, User } from "lucide-react";

export function ServiceTermProgressBar({
  services,
}: {
  services: Pick<
    ServiceProfileItem,
    "kind" | "usedCount" | "quantity" | "termStatus"
  >[];
}) {
  const { used, total, label } = termProgressSummary(services);
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-brand-navy">Term progress</span>
        <span className="tabular-nums text-muted-foreground">
          {used} of {total} {label}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-navy to-brand-light transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function isRedeemableKind(kind: ServiceProfileItem["kind"]): boolean {
  return kind === "COUNTED" || kind === "COUPON" || kind === "EVERY_VISIT";
}

function isInfoOnlyKind(kind: ServiceProfileItem["kind"]): boolean {
  return kind === "UNLIMITED" || kind === "INTERVAL";
}

type ServiceCardProps = {
  service: ServiceProfileItem;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  large?: boolean;
};

export function ServiceProfileCard({
  service,
  checked,
  disabled,
  onToggle,
  large,
}: ServiceCardProps) {
  const remaining =
    service.kind === "COUNTED" || service.kind === "COUPON"
      ? `${service.remainingCount ?? 0} of ${service.quantity ?? "—"} remaining`
      : service.intervalHint;

  const useHint =
    checked &&
    (service.kind === "COUNTED" || service.kind === "COUPON") &&
    service.quantity != null
      ? `Will use 1 of ${service.quantity} (${service.usedCount + 1}/${service.quantity} after visit)`
      : checked && service.kind === "EVERY_VISIT"
        ? "Will record on this visit"
        : null;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onToggle()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "w-full rounded-lg border text-left transition-all",
        large ? "p-4 min-h-[88px]" : "p-3",
        checked
          ? "border-brand-navy bg-brand-navy/5 ring-2 ring-brand-navy/20"
          : "border-border bg-card hover:border-brand-navy/40",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        service.eligibleToday && !checked && !disabled && "border-brand-red/30",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          disabled={disabled}
          className={cn(large && "size-5 mt-0.5")}
          onCheckedChange={() => !disabled && onToggle()}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-semibold text-brand-navy", large && "text-base")}>
              {service.label}
            </span>
            <Badge variant="outline" className={cn("text-[10px]", statusBadgeClass(service.termStatus))}>
              {statusLabel(service.termStatus)}
            </Badge>
          </div>
          {service.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {remaining ? <span>{remaining}</span> : null}
            {service.intervalHint && service.kind !== "COUNTED" && service.kind !== "COUPON" ? (
              <span>{service.intervalHint}</span>
            ) : null}
          </div>
          {useHint ? (
            <p className="text-xs font-medium text-brand-navy">{useHint}</p>
          ) : null}
          {service.lastPerformedAt ? (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              Last: {new Date(service.lastPerformedAt).toLocaleDateString()}
              {service.lastPerformedByName ? (
                <>
                  <User className="ml-1 size-3" />
                  {service.lastPerformedByName}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {checked ? (
          <CheckCircle2 className="size-5 shrink-0 text-green-600 animate-in zoom-in duration-200" />
        ) : null}
      </div>
    </div>
  );
}

function ServiceInfoRow({ service, large }: { service: ServiceProfileItem; large?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-dashed bg-muted/20 p-3 text-left",
        large && "p-4",
      )}
    >
      <Info className={cn("shrink-0 text-brand-navy mt-0.5", large ? "size-5" : "size-4")} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-medium text-brand-navy", large && "text-base")}>
            {service.label}
          </span>
          <Badge variant="outline" className="text-[10px]">
            Included perk
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {service.intervalHint ?? "Apply on the RO or invoice — not counted against visit limits."}
        </p>
      </div>
    </div>
  );
}

export function ServiceVisitChecklist({
  services,
  selectedIds,
  onSelectedChange,
  large,
  locked = false,
}: {
  services: ServiceProfileItem[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  large?: boolean;
  /** Gatekeeper not verified — show checklist preview but disable selection. */
  locked?: boolean;
}) {
  const redeemable = services.filter((s) => isRedeemableKind(s.kind));
  const infoOnly = services.filter((s) => isInfoOnlyKind(s.kind));

  function toggle(id: string, eligible: boolean) {
    if (locked || !eligible) return;
    onSelectedChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  }

  function markAllDue() {
    if (locked) return;
    const due = redeemable.filter((s) => s.eligibleToday).map((s) => s.subscriptionEntitlementId);
    onSelectedChange(due);
  }

  if (!redeemable.length && !infoOnly.length) {
    return <p className="text-sm text-muted-foreground">No trackable services on this plan.</p>;
  }

  const dueCount = redeemable.filter((s) => s.eligibleToday).length;
  const progressServices = services.filter(
    (s) => s.kind === "COUNTED" || s.kind === "COUPON" || isRedeemableKind(s.kind),
  );

  return (
    <div className={cn("space-y-4", locked && "opacity-60")}>
      <ServiceTermProgressBar services={progressServices} />

      {locked ? (
        <p className="text-sm text-muted-foreground italic">
          Confirm the enrolled vehicle above to check off services.
        </p>
      ) : null}

      {!locked && dueCount > 0 ? (
        <button
          type="button"
          onClick={markAllDue}
          className="text-sm font-medium text-brand-navy hover:underline"
        >
          Mark all due today ({dueCount})
        </button>
      ) : null}

      {redeemable.length ? (
        <div className={cn("grid gap-3", large ? "sm:grid-cols-1" : "")}>
          {redeemable.map((service) => (
            <ServiceProfileCard
              key={service.subscriptionEntitlementId}
              service={service}
              checked={selectedIds.includes(service.subscriptionEntitlementId)}
              disabled={locked || !service.eligibleToday}
              large={large}
              onToggle={() => toggle(service.subscriptionEntitlementId, service.eligibleToday)}
            />
          ))}
        </div>
      ) : null}

      {infoOnly.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Included benefits (not counted)
          </p>
          {infoOnly.map((service) => (
            <ServiceInfoRow key={service.subscriptionEntitlementId} service={service} large={large} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type { ServiceTermStatus };
