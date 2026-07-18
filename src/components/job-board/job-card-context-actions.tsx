"use client";

import Link from "next/link";
import { Car, History, MessageSquare } from "lucide-react";

import { useJobBoardContextOptional } from "@/components/job-board/job-board-history-provider";
import { useJobBoardMessagesOptional } from "@/components/job-board/job-board-messages-provider";
import { Button } from "@/components/ui/button";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import { cn } from "@/lib/utils";

/** Quiet icon hit targets — used on kanban cards + list rows (no bordered chips). */
const ICON_BTN =
  "job-board-card-icon-btn size-7 shrink-0 rounded-md p-0 text-[color:var(--jb-slate,#5a6f8c)] hover:bg-brand-navy/[0.06] hover:text-brand-navy";

/** Full-bleed labeled strip — list / legacy only; avoid on simplified kanban cards. */
const LABELED_BTN =
  "job-board-card-action-btn h-auto min-h-7 flex-1 gap-1 rounded-none border-0 bg-transparent px-1 py-1.5 text-[10px] font-medium shadow-none";

function stopCardNav(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/** History / Chat / Vehicle open job board drawers when providers are mounted. */
export function JobCardContextActions({
  roId,
  roNumber,
  customerId,
  customerName,
  customerFirstName,
  customerLastName,
  customerPhone,
  marketingOptIn,
  vehicleId,
  vehicleLabel,
  vehicle,
  unreadSmsCount = 0,
  className,
  iconOnly = false,
  labeled = false,
}: {
  roId: string;
  roNumber: number;
  customerId: string;
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone: string | null;
  marketingOptIn: boolean;
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
  className?: string;
  iconOnly?: boolean;
  /** Screenshot-style labeled footer actions (History / Chat / Vehicle). */
  labeled?: boolean;
}) {
  const ctx = useJobBoardContextOptional();
  const messages = useJobBoardMessagesOptional();

  const showLabels = labeled || !iconOnly;
  const btnClass = labeled ? LABELED_BTN : iconOnly ? ICON_BTN : undefined;
  const variant = labeled || iconOnly ? "ghost" : "outline";
  const size = labeled ? "sm" : iconOnly ? "icon" : "sm";

  const vehicleSeed =
    vehicle ??
    (vehicleId
      ? {
          id: vehicleId,
          year: null,
          make: null,
          model: null,
          plate: null,
          plateState: null,
        }
      : null);

  const historyTarget = {
    customerId,
    customerName,
    customerFirstName,
    customerLastName,
    customerPhone,
    marketingOptIn,
    roId,
    roNumber,
    vehicleId: vehicleSeed?.id ?? vehicleId,
    vehicle: vehicleSeed,
  };

  const chatLabel = labeled ? "Chat" : "Message";
  const vehicleActionLabel = labeled ? "Vehicle" : "Car specs";

  const iconClass = labeled ? "size-3.5 shrink-0 opacity-80" : "size-3.5 shrink-0";

  return (
    <div
      className={cn(
        labeled ? "job-board-card-actions flex w-full items-stretch" : "flex items-center gap-0.5",
        className,
      )}
      onClick={stopCardNav}
      onPointerDown={stopCardNav}
    >
      {ctx ? (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={btnClass}
          title="Customer history"
          aria-label="Customer history"
          onClick={() => ctx.openCustomerHistory(historyTarget)}
        >
          <History className={iconClass} aria-hidden />
          {showLabels ? "History" : null}
        </Button>
      ) : (
        <Button
          asChild
          variant={variant}
          size={size}
          className={btnClass}
          title="Customer history"
        >
          <Link href={roEstimateActionHref(roId, "history")} aria-label="Customer history">
            <History className={iconClass} aria-hidden />
            {showLabels ? "History" : null}
          </Link>
        </Button>
      )}
      {messages ? (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn(btnClass, "relative")}
          title="Message customer"
          aria-label={
            unreadSmsCount > 0
              ? `Message customer, ${unreadSmsCount} unread`
              : "Message customer"
          }
          onClick={() =>
            messages.openRoMessages({
              customerId,
              customerName,
              customerPhone,
              marketingOptIn,
              roId,
            })
          }
        >
          <span className="relative inline-flex">
            <MessageSquare className={iconClass} aria-hidden />
            {unreadSmsCount > 0 ? (
              <span className="job-board-card-chat-badge">
                {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
              </span>
            ) : null}
          </span>
          {showLabels ? chatLabel : null}
        </Button>
      ) : (
        <Button
          asChild
          variant={variant}
          size={size}
          className={cn(btnClass, "relative")}
          title="Message customer"
        >
          <Link
            href={roEstimateActionHref(roId, "messages")}
            aria-label={
              unreadSmsCount > 0
                ? `Message customer, ${unreadSmsCount} unread`
                : "Message customer"
            }
          >
            <span className="relative inline-flex">
              <MessageSquare className={iconClass} aria-hidden />
              {unreadSmsCount > 0 ? (
                <span className="job-board-card-chat-badge">
                  {unreadSmsCount > 9 ? "9+" : unreadSmsCount}
                </span>
              ) : null}
            </span>
            {showLabels ? chatLabel : null}
          </Link>
        </Button>
      )}
      {ctx && vehicleId ? (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={btnClass}
          title="Vehicle specifications"
          aria-label="Vehicle specifications"
          onClick={() =>
            ctx.openVehicleSpecs({
              ...historyTarget,
              vehicleId,
              vehicleLabel,
              vehicle: vehicleSeed!,
            })
          }
        >
          <Car className={iconClass} aria-hidden />
          {showLabels ? vehicleActionLabel : null}
        </Button>
      ) : (
        <Button
          asChild
          variant={variant}
          size={size}
          className={btnClass}
          title="Vehicle specifications"
        >
          <Link href={roEstimateActionHref(roId, "specs")} aria-label="Vehicle specifications">
            <Car className={iconClass} aria-hidden />
            {showLabels ? vehicleActionLabel : null}
          </Link>
        </Button>
      )}
    </div>
  );
}
