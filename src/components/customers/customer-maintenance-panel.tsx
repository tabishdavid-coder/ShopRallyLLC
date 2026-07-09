"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, Shield } from "lucide-react";
import { useState, useTransition } from "react";

import { ServiceVisitFlow } from "@/components/maintenance/service-visit-flow";
import { ServiceTermProgressBar } from "@/components/maintenance/service-visit-checklist";
import {
  VehicleGatekeeperStep,
  VehicleVerifiedBadge,
} from "@/components/maintenance/vehicle-gatekeeper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { enrolledVehicleDetail, checkVehicleGate } from "@/lib/maintenance-gatekeeper";
import { verifyVehicleGatekeeper } from "@/server/actions/maintenance-subscriptions";
import type { PlanSubscriptionStatus } from "@/generated/prisma";
import type { SubscriptionServiceProfile } from "@/server/maintenance-service-visits";
import { cn } from "@/lib/utils";

type EnrolledVehicle = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
  plateState: string | null;
  vin: string | null;
};

export type CustomerMaintenanceEntry = {
  id: string;
  status: PlanSubscriptionStatus;
  endsAt: Date;
  plan: { name: string };
  vehicles: { vehicle: EnrolledVehicle }[];
  profile: SubscriptionServiceProfile;
};

function MaintenanceSubCard({
  entry,
  defaultTechnicianName,
}: {
  entry: CustomerMaintenanceEntry;
  defaultTechnicianName: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(entry.profile);
  const [gateVerified, setGateVerified] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [verifying, startVerify] = useTransition();

  const vehicle = entry.vehicles[0]?.vehicle;
  const vehicleDetail = vehicle ? enrolledVehicleDetail(vehicle) : "—";
  const vehicleGate = vehicle
    ? checkVehicleGate(vehicle, { requireExplicitConfirm: true })
    : null;
  const isActive = entry.status === "ACTIVE" || entry.status === "PAST_DUE";

  function handleGateVerify(opts: {
    plate?: string;
    vinLast6?: string;
    confirmCheckbox?: boolean;
  }) {
    setGateError(null);
    startVerify(async () => {
      const res = await verifyVehicleGatekeeper({
        subscriptionId: entry.id,
        plate: opts.plate,
        vinLast6: opts.vinLast6,
        confirmCheckbox: opts.confirmCheckbox,
      });
      if (res.ok) {
        setGateVerified(true);
        if (res.visitId) setVisitId(res.visitId);
      } else {
        setGateError(res.error);
      }
    });
  }

  return (
    <li className="rounded-lg border bg-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b bg-muted/20 px-4 py-3">
        <div>
          <p className="font-semibold flex items-center gap-1.5">
            <Shield className="size-4 text-brand-navy" />
            {entry.plan.name}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">{vehicleDetail}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              className={cn(
                entry.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-muted",
              )}
            >
              {entry.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Expires {new Date(entry.endsAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1">
          <Link href={`/maintenance-programs/subscribers/${entry.id}`}>
            Full detail
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <ServiceTermProgressBar services={profile.services} />

        {isActive && vehicle && vehicleGate ? (
          <>
            <div className="rounded-md border bg-brand-light/10 px-3 py-2 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-navy">
                Enrolled vehicle
              </p>
              <p className="font-semibold mt-0.5">{vehicleDetail}</p>
            </div>

            <div className="rounded-lg border-2 border-brand-navy/20 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="size-5 text-brand-red" />
                <h3 className="font-semibold text-brand-navy">Service visit</h3>
              </div>

              {gateVerified ? (
                <div className="mb-4">
                  <VehicleVerifiedBadge enrolled={vehicle} />
                </div>
              ) : (
                <div className="mb-4 space-y-2">
                  <VehicleGatekeeperStep
                    enrolled={vehicle}
                    gate={vehicleGate}
                    verifying={verifying}
                    onVerified={handleGateVerify}
                  />
                  {gateError ? <p className="text-sm text-destructive">{gateError}</p> : null}
                </div>
              )}

              <ServiceVisitFlow
                subscriptionId={entry.id}
                services={profile.services}
                vehicleId={vehicle.id}
                defaultTechnicianName={defaultTechnicianName}
                useVisitSession
                visitId={visitId}
                gatekeeperVerified={gateVerified}
                gateLocked={!gateVerified}
                onProfileUpdate={setProfile}
                onComplete={() => router.refresh()}
              />
            </div>
          </>
        ) : (
          <ul className="space-y-2">
            {profile.services.map((s) => (
              <li
                key={s.subscriptionEntitlementId}
                className="flex justify-between text-sm border-b pb-2 last:border-0"
              >
                <span>{s.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {s.kind === "COUNTED" || s.kind === "COUPON"
                    ? `${s.usedCount}/${s.quantity ?? "—"} used`
                    : s.termStatus}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function CustomerMaintenancePanel({
  entries,
  defaultTechnicianName = "",
}: {
  entries: CustomerMaintenanceEntry[];
  defaultTechnicianName?: string;
}) {
  if (!entries.length) return null;

  return (
    <ul className="space-y-4">
      {entries.map((entry) => (
        <MaintenanceSubCard
          key={entry.id}
          entry={entry}
          defaultTechnicianName={defaultTechnicianName}
        />
      ))}
    </ul>
  );
}
