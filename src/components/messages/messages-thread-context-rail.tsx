"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Car,
  Check,
  Copy,
  FileText,
  Loader2,
  Mail,
  Phone,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { useJobBoardContextOptional } from "@/components/job-board/job-board-history-provider";
import { Button } from "@/components/ui/button";
import { customerInitials, formatCents } from "@/lib/format";
import { formatPhoneInput } from "@/lib/phone";
import { RO_STATUS_LABEL } from "@/lib/ro-status";
import type { ROStatus } from "@/generated/prisma";
import type { ConversationRow } from "@/server/messages-inbox";
import type { MessageThreadContext } from "@/server/messages-thread-context";
import { loadMessageThreadContext } from "@/server/actions/messaging-settings";
import { sendEstimateLink } from "@/server/actions/messaging";
import { timeAgo } from "@/lib/datetime";
import {
  useCorePlanShop,
  useFreeformRoIntakeEnabled,
} from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

type AvatarTone = "azure" | "orange" | "navy";

function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] text-[var(--msg-text-3)] transition-colors hover:bg-[var(--msg-bg)] hover:text-[var(--msg-text-2)]"
      aria-label={copied ? "Copied" : `Copy ${label}`}
      onClick={onCopy}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function ConsentTag({ ok, okText, noText }: { ok: boolean; okText: string; noText: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--msg-border)] bg-[var(--msg-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--msg-text-2)]">
      <span
        className={cn("size-1.5 rounded-full", ok ? "bg-[var(--msg-green)]" : "bg-[var(--msg-text-3)]")}
      />
      {ok ? okText : noText}
    </span>
  );
}

function roStatusClass(status: ROStatus): string {
  switch (status) {
    case "ESTIMATE":
      return "bg-[var(--msg-azure-tint)] text-[var(--msg-azure-2)]";
    case "APPROVED":
    case "IN_PROGRESS":
      return "bg-[#EAF7EE] text-[var(--msg-green)]";
    case "COMPLETED":
    case "INVOICED":
      return "bg-[#F1F0FE] text-[#5B4FCF]";
    default:
      return "bg-[var(--msg-bg)] text-[var(--msg-text-2)]";
  }
}

function AiPlusTeaser() {
  const corePlan = useCorePlanShop();
  const aiPlus = useFreeformRoIntakeEnabled();

  // Entitled shops: no teaser / no "coming soon" placeholder.
  if (aiPlus) return null;

  if (!corePlan) {
    return (
      <div className="mb-5">
        <div className="msg-ai-card">
          <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[#DCE9FB] bg-white text-[var(--msg-azure-2)]">
            <Sparkles className="size-3.5" />
          </div>
          <p className="text-[11.5px] leading-snug text-[var(--msg-text-2)]">
            <b className="text-[var(--msg-text)]">AI Plus</b> is available on Ignition (Core) only —
            not on Pro or Elite.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="msg-ai-card">
        <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[#DCE9FB] bg-white text-[var(--msg-azure-2)]">
          <Sparkles className="size-3.5" />
        </div>
        <div className="text-[11.5px] leading-snug text-[var(--msg-text-2)]">
          <b className="text-[var(--msg-text)]">AI Plus</b> can draft a reply using this thread and RO
          history.
          <br />
          <Link
            href="/settings/subscription"
            className="mt-1 inline-block text-[11.5px] font-bold text-[var(--msg-azure-2)] hover:underline"
          >
            Try AI Plus →
          </Link>
        </div>
      </div>
    </div>
  );
}

function RailEmptyState({ mockMode }: { mockMode?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-1 py-6">
      <p className="text-sm font-semibold text-[var(--msg-text)]">Customer context</p>
      <p className="text-xs leading-relaxed text-[var(--msg-text-2)]">
        Select a conversation to see contact info, open ROs, vehicle, and quick actions beside the
        thread.
      </p>
      {mockMode ? (
        <p className="text-xs text-amber-800/90">Demo mode until Twilio is configured</p>
      ) : null}
    </div>
  );
}

function ThreadContextContent({
  selected,
  context,
  avatarTone = "azure",
  onSendEstimate,
  estimatePending,
  estimateError,
}: {
  selected: ConversationRow;
  context: MessageThreadContext;
  avatarTone?: AvatarTone;
  onSendEstimate: (roId: string) => void;
  estimatePending: boolean;
  estimateError: string | null;
}) {
  const historyCtx = useJobBoardContextOptional();
  const vehicle = context.primaryVehicle;
  const vehicleLine = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") +
      (vehicle.trim ? ` ${vehicle.trim}` : "")
    : null;
  const estimateRo =
    context.openRepairOrders.find((ro) => ro.status === "ESTIMATE") ??
    context.openRepairOrders[0] ??
    null;

  function openProfile() {
    if (!historyCtx) return;
    const roId = estimateRo?.id ?? selected.repairOrderId ?? undefined;
    const roNumber = estimateRo?.number ?? selected.repairOrderNumber ?? undefined;
    historyCtx.openCustomerHistory(
      {
        customerId: selected.customerId,
        customerName: `${selected.customerFirstName} ${selected.customerLastName}`.trim(),
        customerFirstName: selected.customerFirstName,
        customerLastName: selected.customerLastName,
        customerPhone: context.phone ?? selected.customerPhone,
        marketingOptIn: context.marketingOptIn,
        roId,
        roNumber,
      },
      { tab: "profile" },
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-4">
        <header className="mb-5 flex flex-col items-start gap-2.5">
          <span
            className={cn(
              "msg-avatar msg-avatar-lg",
              avatarTone === "azure" && "msg-avatar-azure",
              avatarTone === "orange" && "msg-avatar-orange",
              avatarTone === "navy" && "msg-avatar-navy",
            )}
          >
            {customerInitials({
              firstName: selected.customerFirstName,
              lastName: selected.customerLastName,
            })}
          </span>
          <div>
            <p className="text-base font-bold text-[var(--msg-text)]">
              {selected.customerFirstName} {selected.customerLastName}
            </p>
            <p className="mt-px text-[11.5px] text-[var(--msg-text-3)]">
              {context.lastInboundAt
                ? `Last inbound · ${timeAgo(context.lastInboundAt)}`
                : "No inbound yet"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ConsentTag
              ok={context.transactionalSmsConsent}
              okText="SMS ok"
              noText="No SMS consent"
            />
            <ConsentTag
              ok={context.marketingOptIn}
              okText="Marketing on"
              noText="Marketing off"
            />
            {context.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--msg-border)] bg-[var(--msg-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--msg-text-2)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="mb-5">
          <p className="mb-2 text-[10.5px] font-bold tracking-[0.08em] text-[var(--msg-text-3)]">
            CONTACT
          </p>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5 py-1.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--msg-bg)] text-[var(--msg-text-2)]">
                <Phone className="size-3.5" />
              </div>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px] font-medium",
                  context.phone ? "text-[var(--msg-text)]" : "text-[var(--msg-text-3)]",
                )}
              >
                {context.phone ? formatPhoneInput(context.phone) : "No phone"}
              </span>
              {context.phone ? <CopyValueButton value={context.phone} label="phone" /> : null}
            </div>
            <div className="flex items-center gap-2.5 py-1.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--msg-bg)] text-[var(--msg-text-2)]">
                <Mail className="size-3.5" />
              </div>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px] font-medium",
                  context.email ? "text-[var(--msg-text)]" : "text-[var(--msg-text-3)]",
                )}
              >
                {context.email ?? "No email"}
              </span>
              {context.email ? <CopyValueButton value={context.email} label="email" /> : null}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-[10.5px] font-bold tracking-[0.08em] text-[var(--msg-text-3)]">
            VEHICLE
          </p>
          {vehicleLine ? (
            <div className="flex items-center gap-2.5 rounded-[11px] border border-[var(--msg-border)] bg-[var(--msg-bg)] px-3 py-2.5">
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[var(--msg-border-2)] bg-white text-[var(--msg-azure-2)]">
                <Car className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-[var(--msg-text)]">{vehicleLine}</p>
                {vehicle?.plate ? (
                  <p className="text-[11.5px] text-[var(--msg-text-2)]">
                    {vehicle.plateState ? `${vehicle.plateState} · ` : ""}
                    {vehicle.plate}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--msg-text-3)]">No primary vehicle</p>
          )}
        </div>

        <div className="mb-5">
          <p className="mb-2 text-[10.5px] font-bold tracking-[0.08em] text-[var(--msg-text-3)]">
            OPEN ORDERS
          </p>
          {context.openRepairOrders.length > 0 ? (
            <ul className="space-y-2">
              {context.openRepairOrders.map((ro) => (
                <li key={ro.id}>
                  <Link
                    href={`/repair-orders/${ro.id}/estimate`}
                    className="block rounded-[11px] border border-[var(--msg-border)] bg-white px-3 py-2.5 transition-colors hover:border-[#D6E9FD] hover:bg-[var(--msg-azure-tint)]/40"
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-[var(--msg-text)]">
                        RO #{ro.number}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                          roStatusClass(ro.status as ROStatus),
                        )}
                      >
                        {RO_STATUS_LABEL[ro.status as ROStatus] ?? ro.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-[var(--msg-text-2)]">
                        {ro.vehicleLabel}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--msg-text)]">
                        {formatCents(ro.totalCents)}
                      </span>
                    </div>
                    {ro.balanceCents != null && ro.balanceCents > 0 ? (
                      <p className="mt-0.5 text-[11px] font-medium text-brand-red">
                        {formatCents(ro.balanceCents)} due
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--msg-text-3)]">No open repair orders</p>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between rounded-[11px] bg-[var(--msg-bg)] px-3 py-2.5">
            <span className="text-xs font-semibold text-[var(--msg-text-2)]">Lifetime value</span>
            <span className="text-[15px] font-extrabold tabular-nums text-[var(--msg-navy)]">
              {formatCents(context.lifetimeTotalCents)}
            </span>
          </div>
          {context.openBalanceCents > 0 ? (
            <p className="mt-1.5 px-1 text-[11px] font-medium text-brand-red">
              {formatCents(context.openBalanceCents)} open balance
            </p>
          ) : null}
        </div>

        <AiPlusTeaser />
      </div>

      <div className="shrink-0 border-t border-[var(--msg-border)] bg-white pt-3">
        <p className="mb-2 text-[10.5px] font-bold tracking-[0.08em] text-[var(--msg-text-3)]">
          ACTIONS
        </p>
        <div className="flex flex-col gap-2">
          {estimateRo ? (
            <button
              type="button"
              className="msg-primary-btn"
              disabled={estimatePending || !context.phone}
              onClick={() => onSendEstimate(estimateRo.id)}
            >
              {estimatePending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5 fill-current" />
              )}
              Text estimate · RO #{estimateRo.number}
            </button>
          ) : null}
          <div className="flex gap-2">
            {historyCtx ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 flex-1 justify-center gap-1.5 rounded-[9px] border-[var(--msg-border-2)] text-[12.5px] font-semibold shadow-none"
                onClick={openProfile}
              >
                <UserRound className="size-3.5" />
                Profile
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 flex-1 justify-center gap-1.5 rounded-[9px] border-[var(--msg-border-2)] text-[12.5px] font-semibold shadow-none"
              >
                <Link href={`/customers?customer=${selected.customerId}`}>
                  <UserRound className="size-3.5" />
                  Profile
                </Link>
              </Button>
            )}
            {estimateRo ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 flex-1 justify-center gap-1.5 rounded-[9px] border-[var(--msg-border-2)] text-[12.5px] font-semibold shadow-none"
              >
                <Link href={`/repair-orders/${estimateRo.id}/estimate`}>
                  <FileText className="size-3.5" />
                  Open RO
                </Link>
              </Button>
            ) : null}
          </div>
          {estimateError ? (
            <p className="text-[11px] text-destructive">{estimateError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MessagesThreadContextRail({
  selected,
  context: contextProp,
  contextLoading: contextLoadingProp,
  avatarTone,
  mockMode = false,
  mobileOpen = false,
  onMobileClose,
  onEstimateSent,
  className,
}: {
  selected: ConversationRow | null;
  /** Preloaded context from inbox (avoids a second fetch). */
  context?: MessageThreadContext | null;
  contextLoading?: boolean;
  avatarTone?: AvatarTone;
  mockMode?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onEstimateSent?: () => void;
  className?: string;
}) {
  const [localContext, setLocalContext] = useState<MessageThreadContext | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimatePending, startEstimate] = useTransition();

  const controlled = contextProp !== undefined;
  const context = controlled ? (contextProp ?? null) : localContext;
  const loading = controlled ? Boolean(contextLoadingProp) : localLoading;

  useEffect(() => {
    if (controlled) return;
    if (!selected?.customerId) {
      setLocalContext(null);
      return;
    }
    setLocalLoading(true);
    setEstimateError(null);
    loadMessageThreadContext(selected.customerId)
      .then(setLocalContext)
      .catch(() => setLocalContext(null))
      .finally(() => setLocalLoading(false));
  }, [selected?.customerId, controlled]);

  useEffect(() => {
    setEstimateError(null);
  }, [selected?.customerId]);

  function sendEstimate(roId: string) {
    startEstimate(async () => {
      const res = await sendEstimateLink(roId, "sms");
      if (res.ok) {
        setEstimateError(null);
        onEstimateSent?.();
      } else {
        setEstimateError(res.error ?? "Could not send estimate link.");
      }
    });
  }

  const inner = (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--msg-border)] px-1 py-2.5 lg:hidden">
        <p className="text-xs font-semibold text-[var(--msg-text)]">Customer details</p>
        {onMobileClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMobileClose}
            aria-label="Close details"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {!selected ? (
        <RailEmptyState mockMode={mockMode} />
      ) : loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-[var(--msg-text-2)]">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : context ? (
        <ThreadContextContent
          selected={selected}
          context={context}
          avatarTone={avatarTone}
          onSendEstimate={sendEstimate}
          estimatePending={estimatePending}
          estimateError={estimateError}
        />
      ) : (
        <p className="p-4 text-sm text-[var(--msg-text-2)]">Could not load customer context.</p>
      )}
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "msg-workspace hidden min-h-0 w-[322px] shrink-0 flex-col overflow-hidden border-l border-[var(--msg-border)] bg-white px-[18px] py-5 lg:flex",
          className,
        )}
      >
        {inner}
      </aside>

      {mobileOpen && selected ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close details"
            onClick={onMobileClose}
          />
          <aside className="msg-workspace relative ml-auto flex h-full w-[min(100%,322px)] flex-col overflow-hidden border-l border-[var(--msg-border)] bg-white px-[18px] py-5 shadow-xl">
            {inner}
          </aside>
        </div>
      ) : null}
    </>
  );
}
