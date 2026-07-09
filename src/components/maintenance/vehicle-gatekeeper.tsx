"use client";

import { useState } from "react";
import { AlertTriangle, Car, CheckCircle2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  enrolledVehicleDetail,
  type EnrolledVehicle,
  type VehicleGateResult,
} from "@/lib/maintenance-gatekeeper";
import { cn } from "@/lib/utils";

type Props = {
  enrolled: EnrolledVehicle;
  gate: VehicleGateResult;
  large?: boolean;
  onVerified: (opts: { plate?: string; vinLast6?: string; confirmCheckbox?: boolean }) => void;
  verifying?: boolean;
};

export function VehicleGatekeeperStep({
  enrolled,
  gate,
  large = false,
  onVerified,
  verifying = false,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [plate, setPlate] = useState("");

  if (gate.status === "verified") {
    return <VehicleVerifiedBadge enrolled={enrolled} large={large} />;
  }

  if (gate.status === "blocked") {
    return <VehicleGateBlock gate={gate} enrolled={enrolled} />;
  }

  const detail = enrolledVehicleDetail(enrolled);

  return (
    <div className="rounded-lg border-2 border-brand-navy/30 bg-brand-light/10 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Car className={cn("shrink-0 text-brand-navy", large ? "size-6" : "size-5")} />
        <div>
          <p className={cn("font-semibold text-brand-navy", large && "text-lg")}>
            Step — Confirm vehicle
          </p>
          <p className="text-sm text-on-brand-wash mt-1">
            Benefits apply to this vehicle only. Verify before continuing.
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Enrolled vehicle
        </p>
        <p className="font-semibold mt-1">{detail}</p>
      </div>

      <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50">
        <Checkbox
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          className={cn("mt-0.5", large && "size-5")}
        />
        <span className={cn("text-sm", large && "text-base")}>
          I confirm this is the enrolled vehicle at the counter
        </span>
      </label>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Or scan / enter license plate to verify
        </Label>
        <Input
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className={cn(large && "h-12 text-base uppercase")}
        />
      </div>

      <Button
        type="button"
        className={cn("w-full bg-brand-navy", large && "h-12 text-base")}
        disabled={verifying || (!confirmed && !plate.trim())}
        onClick={() =>
          onVerified({
            confirmCheckbox: confirmed,
            plate: confirmed ? undefined : plate.trim() || undefined,
          })
        }
      >
        {verifying ? "Verifying…" : "Verify vehicle & continue"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Plan transfers are not available. Contact a manager to void and re-enroll on a different
        vehicle.
      </p>
    </div>
  );
}

export function VehicleVerifiedBadge({
  enrolled,
  detail,
  large = false,
}: {
  enrolled: EnrolledVehicle;
  detail?: string;
  large?: boolean;
}) {
  const label = detail ?? enrolledVehicleDetail(enrolled);
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800",
        large && "px-4 py-3",
      )}
    >
      <CheckCircle2 className={cn("shrink-0", large ? "size-5" : "size-4")} />
      <div className={cn("text-sm", large && "text-base")}>
        <span className="font-semibold">Vehicle verified ✓</span>
        <span className="text-green-700"> — {label}</span>
      </div>
    </div>
  );
}

export function VehicleGateBlock({
  gate,
  enrolled,
}: {
  gate: VehicleGateResult;
  enrolled: EnrolledVehicle;
}) {
  return (
    <div className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="size-6 shrink-0 text-destructive" />
        <div>
          <p className="font-bold text-destructive uppercase tracking-wide text-sm">
            Gate blocked
          </p>
          <p className="text-sm mt-1">{gate.message}</p>
        </div>
      </div>
      <div className="rounded-md border bg-card p-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Enrolled vehicle</p>
        <p className="font-semibold mt-0.5">{enrolledVehicleDetail(enrolled)}</p>
      </div>
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
        Contact a manager to transfer — plan transfers are disabled in this version. Void the
        membership and re-enroll on the correct vehicle.
      </p>
    </div>
  );
}

export function RoVehicleMismatchBlock({
  enrolledLabel,
  roVehicleLabel,
}: {
  enrolledLabel: string;
  roVehicleLabel: string;
}) {
  return (
    <div className="rounded-md border-2 border-destructive/40 bg-destructive/5 p-3 mb-3 space-y-2">
      <p className="text-sm font-semibold text-destructive flex items-center gap-2">
        <ShieldAlert className="size-4" />
        Wrong vehicle for this membership
      </p>
      <p className="text-sm text-muted-foreground">
        This RO is for <strong>{roVehicleLabel}</strong>. Membership benefits apply to{" "}
        <strong>{enrolledLabel}</strong> only.
      </p>
      <p className="text-xs text-muted-foreground">
        Contact a manager to transfer — not available in MVP.
      </p>
    </div>
  );
}
