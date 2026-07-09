"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleGateBlock, VehicleVerifiedBadge } from "@/components/maintenance/vehicle-gatekeeper";
import { getRedeemableEntitlements } from "@/lib/maintenance-redemption";
import { enrolledVehicleDetail } from "@/lib/maintenance-gatekeeper";
import {
  redeemMaintenanceServices,
  lookupMemberForVisit,
} from "@/server/actions/maintenance-subscriptions";
import type { MemberLookupRow } from "@/server/maintenance-subscriptions";
import type { EntitlementKind, PlanSubscriptionStatus } from "@/generated/prisma";

export function ExpressRedeemClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberLookupRow[]>([]);
  const [selectedSub, setSelectedSub] = useState<MemberLookupRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mileage, setMileage] = useState("");
  const [gateConfirmed, setGateConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [redeeming, startRedeem] = useTransition();

  function search() {
    setError(null);
    setSelectedSub(null);
    setGateConfirmed(false);
    startSearch(async () => {
      const rows = await lookupMemberForVisit(query);
      setResults(rows);
      if (rows.length === 1) {
        setSelectedSub(rows[0]!);
        setGateConfirmed(rows[0]!.vehicleGate.status === "verified");
      }
      if (!rows.length) setError("No active membership found.");
    });
  }

  const redeemable = selectedSub
    ? getRedeemableEntitlements(
        { status: selectedSub.status as PlanSubscriptionStatus, entitlements: selectedSub.entitlements },
        selectedSub.plan.entitlements.map((e) => ({
          id: e.id,
          kind: e.kind as EntitlementKind,
          label: e.label,
          quantity: e.quantity,
          intervalDays: e.intervalDays,
        })),
      )
    : [];

  const enrolled = selectedSub?.enrolledVehicle;
  const gateBlocked = selectedSub?.vehicleGate.status === "blocked";
  const gateNeedsConfirm =
    selectedSub?.vehicleGate.status === "confirm_required" && !gateConfirmed;

  function redeem(createRo: boolean) {
    if (!selectedSub || !selectedIds.length) {
      setError("Select a member and at least one service.");
      return;
    }
    if (gateBlocked) {
      setError("Vehicle gate blocked — cannot redeem on a different vehicle.");
      return;
    }
    if (gateNeedsConfirm) {
      setError("Confirm the enrolled vehicle before redeeming.");
      return;
    }
    setError(null);
    startRedeem(async () => {
      const vehicleId = enrolled?.id;
      const res = await redeemMaintenanceServices({
        subscriptionId: selectedSub.id,
        subscriptionEntitlementIds: selectedIds,
        vehicleId,
        mileageIn: mileage ? parseInt(mileage, 10) : undefined,
        gatekeeperConfirm: gateConfirmed || selectedSub.vehicleGate.status === "verified",
      });
      if (res.ok) {
        if (createRo && vehicleId) {
          router.push(
            `/repair-orders/new?customerId=${selectedSub.customerId}&vehicleId=${vehicleId}`,
          );
        } else {
          router.push(`/maintenance-programs/subscribers/${selectedSub.id}`);
        }
      } else {
        setError(res.error);
      }
    });
  }

  const memberName = selectedSub
    ? selectedSub.customer.company?.trim() ||
      `${selectedSub.customer.lastName} ${selectedSub.customer.firstName}`.trim()
    : "";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Ticket className="size-5 text-brand-navy" />
          <h2 className="font-semibold">Express redeem</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Look up a member by phone, name, or license plate. Benefits apply to the enrolled vehicle
          only.
        </p>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Phone, name, or plate…"
            className="h-11"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search} disabled={searching} className="shrink-0 bg-brand-navy">
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </div>

        {results.length > 1 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Multiple matches — select one:</p>
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedSub(r);
                  setSelectedIds([]);
                  setGateConfirmed(r.vehicleGate.status === "verified");
                }}
                className="w-full rounded-md border p-3 text-left text-sm hover:bg-accent"
              >
                {r.customer.lastName} {r.customer.firstName} — {r.plan.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selectedSub && enrolled ? (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div>
            <p className="font-semibold">{memberName}</p>
            <p className="text-sm text-muted-foreground">{selectedSub.plan.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{enrolledVehicleDetail(enrolled)}</p>
          </div>

          {gateBlocked ? (
            <VehicleGateBlock gate={selectedSub.vehicleGate} enrolled={enrolled} />
          ) : selectedSub.vehicleGate.status === "verified" ? (
            <VehicleVerifiedBadge enrolled={enrolled} />
          ) : (
            <label className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                checked={gateConfirmed}
                onCheckedChange={(v) => setGateConfirmed(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                I confirm this is the enrolled vehicle ({enrolledVehicleDetail(enrolled)})
              </span>
            </label>
          )}

          {!gateBlocked ? (
            <>
              <div className="space-y-2">
                {redeemable.map((r) => (
                  <label key={r.subscriptionEntitlementId} className="flex items-center gap-3 rounded-md border p-3">
                    <Checkbox
                      checked={selectedIds.includes(r.subscriptionEntitlementId)}
                      disabled={!r.eligible || gateNeedsConfirm}
                      onCheckedChange={() =>
                        setSelectedIds((s) =>
                          s.includes(r.subscriptionEntitlementId)
                            ? s.filter((x) => x !== r.subscriptionEntitlementId)
                            : [...s, r.subscriptionEntitlementId],
                        )
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.reason}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <Label className="text-xs">Mileage</Label>
                <Input
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="mt-1 h-9 max-w-[160px]"
                />
              </div>
            </>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!gateBlocked ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => redeem(false)}
                disabled={redeeming || gateNeedsConfirm}
                className="bg-brand-navy"
              >
                {redeeming ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                Redeem only
              </Button>
              <Button variant="outline" onClick={() => redeem(true)} disabled={redeeming || gateNeedsConfirm}>
                Redeem + new RO
              </Button>
              <Button variant="ghost" asChild>
                <Link href={`/maintenance-programs/subscribers/${selectedSub.id}`}>View membership</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
