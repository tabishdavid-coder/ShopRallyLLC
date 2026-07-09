"use client";

import Link from "next/link";
import { Car, History, MessageSquare } from "lucide-react";

import { useJobBoardContextOptional } from "@/components/job-board/job-board-history-provider";
import { useJobBoardMessagesOptional } from "@/components/job-board/job-board-messages-provider";
import { Button } from "@/components/ui/button";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import { cn } from "@/lib/utils";

const ICON_BTN =
  "size-7 shrink-0 rounded-md p-0 text-brand-navy/65 hover:bg-brand-light/25 hover:text-brand-navy";

function stopCardNav(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/** History / Message / Car specs open job board drawers when providers are mounted. */
export function JobCardContextActions({
  roId,
  roNumber,
  customerId,
  customerName,
  customerPhone,
  marketingOptIn,
  vehicleId,
  vehicleLabel,
  className,
  iconOnly = false,
}: {
  roId: string;
  roNumber: number;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  marketingOptIn: boolean;
  vehicleId: string | null;
  vehicleLabel: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const ctx = useJobBoardContextOptional();
  const messages = useJobBoardMessagesOptional();

  const btnClass = iconOnly ? ICON_BTN : undefined;

  return (
    <div
      className={cn("flex gap-0.5", className)}
      onClick={stopCardNav}
      onPointerDown={stopCardNav}
    >
      {ctx ? (
        <Button
          type="button"
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon" : "sm"}
          className={btnClass}
          title="Customer history"
          aria-label="Customer history"
          onClick={() =>
            ctx.openCustomerHistory({
              customerId,
              customerName,
              roId,
              roNumber,
            })
          }
        >
          <History className="size-3.5 shrink-0" aria-hidden />
          {!iconOnly ? "History" : null}
        </Button>
      ) : (
        <Button
          asChild
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon" : "sm"}
          className={btnClass}
          title="Customer history"
        >
          <Link href={roEstimateActionHref(roId, "history")} aria-label="Customer history">
            <History className="size-3.5 shrink-0" aria-hidden />
            {!iconOnly ? "History" : null}
          </Link>
        </Button>
      )}
      {messages ? (
        <Button
          type="button"
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon" : "sm"}
          className={btnClass}
          title="Message customer"
          aria-label="Message customer"
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
          <MessageSquare className="size-3.5 shrink-0" aria-hidden />
          {!iconOnly ? "Message" : null}
        </Button>
      ) : (
        <Button
          asChild
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon" : "sm"}
          className={btnClass}
          title="Message customer"
        >
          <Link href={roEstimateActionHref(roId, "messages")} aria-label="Message customer">
            <MessageSquare className="size-3.5 shrink-0" aria-hidden />
            {!iconOnly ? "Message" : null}
          </Link>
        </Button>
      )}
      {ctx && vehicleId ? (
        <Button
          type="button"
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon" : "sm"}
          className={btnClass}
          title="Vehicle specifications"
          aria-label="Vehicle specifications"
          onClick={() =>
            ctx.openVehicleSpecs({
              vehicleId,
              vehicleLabel,
              roId,
              roNumber,
            })
          }
        >
          <Car className="size-3.5 shrink-0" aria-hidden />
          {!iconOnly ? "Car specs" : null}
        </Button>
      ) : (
        <Button
          asChild
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon" : "sm"}
          className={btnClass}
          title="Vehicle specifications"
        >
          <Link href={roEstimateActionHref(roId, "specs")} aria-label="Vehicle specifications">
            <Car className="size-3.5 shrink-0" aria-hidden />
            {!iconOnly ? "Car specs" : null}
          </Link>
        </Button>
      )}
    </div>
  );
}
