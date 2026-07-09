"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ServiceVisitChecklist } from "@/components/maintenance/service-visit-checklist";
import {
  completeMaintenanceServiceVisit,
  fetchSubscriptionServiceProfile,
  redeemMaintenanceServices,
  startMaintenanceServiceVisit,
} from "@/server/actions/maintenance-subscriptions";
import type { ServiceProfileItem } from "@/lib/maintenance-service-profile";
import type { SubscriptionServiceProfile } from "@/server/maintenance-service-visits";
import { cn } from "@/lib/utils";

type Props = {
  subscriptionId: string;
  services: ServiceProfileItem[];
  vehicleId?: string | null;
  repairOrderId?: string | null;
  defaultTechnicianName?: string;
  initialMileage?: number | null;
  /** Use two-step start + complete (subscriber detail). One-shot when false. */
  useVisitSession?: boolean;
  /** Pre-started visit from gatekeeper verify (skips auto-start). */
  visitId?: string | null;
  /** Gatekeeper already verified upstream (express visit / RO auto-match). */
  gatekeeperVerified?: boolean;
  /** Show checklist preview but disable complete until verified. */
  gateLocked?: boolean;
  large?: boolean;
  onComplete?: () => void;
  onProfileUpdate?: (profile: SubscriptionServiceProfile) => void;
  redirectTo?: string;
};

export function ServiceVisitFlow({
  subscriptionId,
  services,
  vehicleId,
  repairOrderId,
  defaultTechnicianName = "",
  initialMileage,
  useVisitSession = false,
  visitId: visitIdProp,
  gatekeeperVerified = false,
  gateLocked = false,
  large = false,
  onComplete,
  onProfileUpdate,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mileage, setMileage] = useState(initialMileage != null ? String(initialMileage) : "");
  const [notes, setNotes] = useState("");
  const [technician, setTechnician] = useState(defaultTechnicianName);
  const [visitId, setVisitId] = useState<string | null>(visitIdProp ?? null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();
  const [starting, startVisit] = useTransition();

  useEffect(() => {
    setVisitId(visitIdProp ?? null);
  }, [visitIdProp]);

  useEffect(() => {
    if (!useVisitSession || visitId || gateLocked || !gatekeeperVerified) return;
    startVisit(async () => {
      const res = await startMaintenanceServiceVisit({
        subscriptionId,
        vehicleId: vehicleId ?? undefined,
        repairOrderId: repairOrderId ?? undefined,
        gatekeeperConfirm: true,
      });
      if (res.ok && res.redemptionId) setVisitId(res.redemptionId);
      else if (!res.ok) setError(res.error);
    });
  }, [
    subscriptionId,
    vehicleId,
    repairOrderId,
    useVisitSession,
    gatekeeperVerified,
    gateLocked,
    visitId,
  ]);

  async function refreshProfile() {
    const profile = await fetchSubscriptionServiceProfile(subscriptionId);
    if (profile) onProfileUpdate?.(profile);
    onComplete?.();
    router.refresh();
  }

  function complete() {
    if (gateLocked || !gatekeeperVerified) {
      setError("Confirm the enrolled vehicle before completing this visit.");
      return;
    }
    if (!selectedIds.length) {
      setError("Select at least one service performed today.");
      return;
    }
    setError(null);
    start(async () => {
      const payload = {
        subscriptionId,
        subscriptionEntitlementIds: selectedIds,
        vehicleId: vehicleId ?? undefined,
        repairOrderId: repairOrderId ?? undefined,
        mileageIn: mileage ? parseInt(mileage, 10) : undefined,
        notes: notes.trim() || undefined,
        performedByName: technician.trim() || undefined,
        gatekeeperConfirm: gatekeeperVerified || undefined,
      };

      const res =
        useVisitSession && visitId
          ? await completeMaintenanceServiceVisit({
              visitId,
              subscriptionEntitlementIds: selectedIds,
              mileageIn: payload.mileageIn,
              notes: payload.notes,
              performedByName: payload.performedByName,
              gatekeeperConfirm: gatekeeperVerified || undefined,
            })
          : await redeemMaintenanceServices(payload);

      if (res.ok) {
        setSuccess(true);
        setSelectedIds([]);
        setNotes("");
        setMileage("");
        setVisitId(null);
        await refreshProfile();
        setTimeout(() => {
          if (redirectTo) router.push(redirectTo);
          setSuccess(false);
        }, 1500);
      } else {
        setError(res.error);
      }
    });
  }

  const hasEligible = services.some((s) => s.eligibleToday);
  const canComplete =
    !gateLocked &&
    gatekeeperVerified &&
    hasEligible &&
    (!useVisitSession || Boolean(visitId));

  return (
    <div className="space-y-4">
      {starting ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Starting visit…
        </p>
      ) : null}

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Visit recorded — service counts updated.
        </div>
      ) : null}

      <ServiceVisitChecklist
        services={services}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
        large={large}
        locked={gateLocked || !gatekeeperVerified}
      />

      <div
        className={cn(
          "space-y-4",
          (gateLocked || !gatekeeperVerified) && "pointer-events-none opacity-50",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Technician</Label>
            <Input
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className={cn("mt-1", large && "h-11")}
              placeholder="Who performed the work?"
              disabled={gateLocked || !gatekeeperVerified}
            />
          </div>
          <div>
            <Label className="text-xs">Mileage in</Label>
            <Input
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              inputMode="numeric"
              className={cn("mt-1", large && "h-11")}
              placeholder="Optional"
              disabled={gateLocked || !gatekeeperVerified}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Visit notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 resize-none"
            placeholder="Optional notes for the audit log"
            disabled={gateLocked || !gatekeeperVerified}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        onClick={complete}
        disabled={pending || !canComplete}
        className={cn(
          "w-full sm:w-auto bg-brand-navy",
          large && "h-12 px-8 text-base",
          success && "bg-green-600 hover:bg-green-600",
        )}
      >
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="mr-2 size-5 animate-in zoom-in" />
        ) : null}
        {success ? "Visit saved!" : "Complete visit"}
      </Button>
    </div>
  );
}
