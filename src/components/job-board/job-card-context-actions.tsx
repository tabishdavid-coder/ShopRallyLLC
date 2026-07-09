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
  customerFirstName,
  customerLastName,
  customerPhone,
  marketingOptIn,
  vehicleId,
  vehicleLabel,
  vehicle,
  className,
  iconOnly = false,
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
  className?: string;
  iconOnly?: boolean;
}) {
  const ctx = useJobBoardContextOptional();
  const messages = useJobBoardMessagesOptional();

  const btnClass = iconOnly ? ICON_BTN : undefined;

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
          onClick={() => ctx.openCustomerHistory(historyTarget)}
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
              ...historyTarget,
              vehicleId,
              vehicleLabel,
              vehicle: vehicleSeed!,
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
