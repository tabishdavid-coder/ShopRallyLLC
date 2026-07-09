"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Ticket } from "lucide-react";

import { ServiceVisitFlow } from "@/components/maintenance/service-visit-flow";
import {
  RoVehicleMismatchBlock,
  VehicleVerifiedBadge,
} from "@/components/maintenance/vehicle-gatekeeper";
import type { ServiceProfileItem } from "@/lib/maintenance-service-profile";
import {
  membershipFallbackHeading,
  membershipHeading,
} from "@/lib/care-plan-labels";
import type { PlanSubscriptionStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubPanel = {
  subscriptionId: string;
  planName: string;
  status: PlanSubscriptionStatus;
  enrolledVehicleId: string;
  enrolledVehicleLabel: string;
  vehicleVerified: boolean;
  services: ServiceProfileItem[];
};

type MismatchPanel = {
  subscriptionId: string;
  planName: string;
  enrolledVehicleLabel: string;
};

type Props = {
  roId: string;
  vehicleId: string;
  roVehicleLabel: string;
  mileageIn: number | null;
  defaultTechnicianName: string;
  subscriptions: SubPanel[];
  mismatched?: MismatchPanel[];
  /** Dedicated tab page — always expanded, no inline banner strip */
  fullPage?: boolean;
};

export function RoMaintenancePanel({
  roId,
  vehicleId,
  roVehicleLabel,
  mileageIn,
  defaultTechnicianName,
  subscriptions,
  mismatched = [],
  fullPage = false,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!subscriptions.length && !mismatched.length) return null;

  const sub = subscriptions[activeIdx] ?? subscriptions[0];

  const shellClass = fullPage
    ? "rounded-lg border border-brand-light/35 bg-brand-light/10 p-4 md:p-5"
    : "border-b border-brand-navy/20 bg-brand-light/15 px-4 py-3 md:px-5";

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        {fullPage ? (
          <h2 className="flex items-center gap-2 text-base font-semibold text-brand-navy">
            <Ticket className="size-4 text-brand-light" />
            {sub ? membershipHeading(sub.planName) : membershipFallbackHeading()}
          </h2>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 text-sm font-semibold text-brand-navy"
          >
            <Ticket className="size-4 text-brand-red" />
            {sub ? membershipHeading(sub.planName) : membershipFallbackHeading()}
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
        {sub ? (
          <Link
            href={`/maintenance-programs/subscribers/${sub.subscriptionId}`}
            className="text-xs text-brand-navy hover:underline"
          >
            View membership
          </Link>
        ) : null}
      </div>

      {mismatched.map((m) => (
        <RoVehicleMismatchBlock
          key={m.subscriptionId}
          enrolledLabel={m.enrolledVehicleLabel}
          roVehicleLabel={roVehicleLabel}
        />
      ))}

      {subscriptions.length > 1 ? (
        <select
          className="mt-2 text-xs rounded border px-2 py-1.5 min-h-[36px]"
          value={activeIdx}
          onChange={(e) => setActiveIdx(parseInt(e.target.value, 10))}
        >
          {subscriptions.map((s, i) => (
            <option key={s.subscriptionId} value={i}>
              {s.planName}
            </option>
          ))}
        </select>
      ) : null}

      {expanded && sub ? (
        <div className={cn("mt-3 space-y-3 rounded-md border bg-card p-3", fullPage && "mt-4")}>
          {sub.vehicleVerified ? (
            <VehicleVerifiedBadge
              enrolled={{
                id: sub.enrolledVehicleId,
                year: null,
                make: null,
                model: null,
                plate: null,
                plateState: null,
                vin: null,
              }}
              detail={sub.enrolledVehicleLabel}
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            Enrolled: <strong>{sub.enrolledVehicleLabel}</strong>
          </p>
          <ServiceVisitFlow
            subscriptionId={sub.subscriptionId}
            services={sub.services}
            vehicleId={vehicleId}
            repairOrderId={roId}
            defaultTechnicianName={defaultTechnicianName}
            initialMileage={mileageIn}
            gatekeeperVerified={sub.vehicleVerified}
            large
          />
        </div>
      ) : sub && !fullPage ? (
        <Button
          variant="link"
          size="sm"
          className="mt-1 h-auto p-0 text-brand-navy"
          onClick={() => setExpanded(true)}
        >
          Open maintenance checklist
        </Button>
      ) : null}
    </div>
  );
}
