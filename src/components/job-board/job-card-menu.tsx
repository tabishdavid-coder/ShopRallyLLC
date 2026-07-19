"use client";

import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Car,
  CheckCircle2,
  ExternalLink,
  History,
  MessageSquare,
  MoreVertical,
  Tag,
} from "lucide-react";

import { useJobBoardContextOptional } from "@/components/job-board/job-board-history-provider";
import { useJobBoardMessagesOptional } from "@/components/job-board/job-board-messages-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { openRoLabelPrint } from "@/lib/ro-label";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import { defaultRoOpenHref } from "@/lib/ro-workspace";

export type JobCardMenuContext = {
  customerId: string;
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone: string | null;
  marketingOptIn: boolean;
  roNumber: number;
  vehicleId: string | null;
  vehicleLabel: string;
  vehicle?: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    plate: string | null;
    plateState: string | null;
  } | null;
  unreadSmsCount?: number;
};

/** Per-card action menu. Handlers live on the board so it owns board state. */
export function JobCardMenu({
  columnId,
  moveTargets,
  isEstimate,
  canArchive = false,
  roId,
  openHref,
  onMove,
  onAuthorize,
  onArchive,
  context,
}: {
  columnId: string;
  moveTargets: { id: string; title: string }[];
  isEstimate: boolean;
  canArchive?: boolean;
  roId: string;
  /** Override for workflow board deep-links; defaults to estimate workspace. */
  openHref?: string;
  onMove: (toColumnId: string) => void;
  onAuthorize: () => void;
  onArchive?: () => void;
  /** History / chat / vehicle — also on-card as icons; menu keeps them for overflow. */
  context?: JobCardMenuContext;
}) {
  const ap3030 = isAutopilot3030Shell();
  const ctx = useJobBoardContextOptional();
  const messages = useJobBoardMessagesOptional();
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();
  const href = openHref ?? defaultRoOpenHref(roId);

  const historyTarget = context
    ? {
        customerId: context.customerId,
        customerName: context.customerName,
        customerFirstName: context.customerFirstName,
        customerLastName: context.customerLastName,
        customerPhone: context.customerPhone,
        marketingOptIn: context.marketingOptIn,
        roId,
        roNumber: context.roNumber,
        vehicleId: context.vehicle?.id ?? context.vehicleId,
        vehicle: context.vehicle ?? null,
      }
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onPointerDown={stop}
        onClick={stop}
        aria-label="Repair order actions"
        className="job-board-card-menu-btn flex size-6 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-brand-navy/5 hover:text-brand-navy data-[state=open]:bg-brand-navy/8 data-[state=open]:text-brand-navy"
      >
        <MoreVertical className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={stop} className="w-52">
        <DropdownMenuItem asChild className="font-medium text-brand-navy focus:text-brand-navy">
          <Link href={href}>
            <ExternalLink className="size-4" />
            {ap3030 ? `Open ${AP_TERMS.repairOrder.toLowerCase()}` : "Open repair order"}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => openRoLabelPrint(roId)}>
          <Tag className="size-4" />
          Print RO Label
        </DropdownMenuItem>

        {context && historyTarget ? (
          <>
            <DropdownMenuSeparator />
            {ctx ? (
              <DropdownMenuItem onSelect={() => ctx.openCustomerHistory(historyTarget)}>
                <History className="size-4" />
                Customer history
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href={roEstimateActionHref(roId, "history")}>
                  <History className="size-4" />
                  Customer history
                </Link>
              </DropdownMenuItem>
            )}
            {messages ? (
              <DropdownMenuItem
                onSelect={() =>
                  messages.openRoMessages({
                    customerId: context.customerId,
                    customerName: context.customerName,
                    customerPhone: context.customerPhone,
                    marketingOptIn: context.marketingOptIn,
                    roId,
                  })
                }
              >
                <MessageSquare className="size-4" />
                {(context.unreadSmsCount ?? 0) > 0
                  ? `Messages (${context.unreadSmsCount! > 9 ? "9+" : context.unreadSmsCount})`
                  : "Message customer"}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href={roEstimateActionHref(roId, "messages")}>
                  <MessageSquare className="size-4" />
                  Message customer
                </Link>
              </DropdownMenuItem>
            )}
            {context.vehicleId ? (
              ctx ? (
                <DropdownMenuItem
                  onSelect={() =>
                    ctx.openVehicleSpecs({
                      ...historyTarget,
                      vehicleId: context.vehicleId!,
                      vehicleLabel: context.vehicleLabel,
                      vehicle: context.vehicle ?? {
                        id: context.vehicleId!,
                        year: null,
                        make: null,
                        model: null,
                        plate: null,
                        plateState: null,
                      },
                    })
                  }
                >
                  <Car className="size-4" />
                  Vehicle specs
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href={roEstimateActionHref(roId, "specs")}>
                    <Car className="size-4" />
                    Vehicle specs
                  </Link>
                </DropdownMenuItem>
              )
            ) : null}
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowRight className="size-3.5" /> Move to
        </DropdownMenuLabel>
        {moveTargets.map((target) => (
          <DropdownMenuItem
            key={target.id}
            disabled={target.id === columnId}
            onSelect={() => onMove(target.id)}
          >
            {target.title}
          </DropdownMenuItem>
        ))}

        {isEstimate ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onAuthorize} className="font-medium text-brand-navy focus:text-brand-navy">
              <CheckCircle2 className="size-4" />
              {ap3030 ? `Authorize ${AP_TERMS.estimate.toLowerCase()}` : "Authorize estimate"}
            </DropdownMenuItem>
          </>
        ) : null}

        {onArchive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onArchive} className="font-medium text-emerald-800 focus:text-emerald-800">
              <Archive className="size-4" />
              {ap3030 ? `Archive ${AP_TERMS.repairOrder.toLowerCase()}` : "Archive order"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
