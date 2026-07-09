"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search, Ticket, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServiceVisitFlow } from "@/components/maintenance/service-visit-flow";
import {
  VehicleGateBlock,
  VehicleGatekeeperStep,
  VehicleVerifiedBadge,
} from "@/components/maintenance/vehicle-gatekeeper";
import {
  fetchSubscriptionServiceProfile,
  lookupMemberForVisit,
  verifyVehicleGatekeeper,
} from "@/server/actions/maintenance-subscriptions";
import type { MemberLookupRow } from "@/server/maintenance-subscriptions";
import type { SubscriptionServiceProfile } from "@/server/maintenance-service-visits";
import { enrolledVehicleDetail } from "@/lib/maintenance-gatekeeper";

type Step = "find" | "gatekeeper" | "checklist" | "done";

export function ExpressVisitClient({ defaultTechnicianName }: { defaultTechnicianName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("find");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberLookupRow[]>([]);
  const [selectedSub, setSelectedSub] = useState<MemberLookupRow | null>(null);
  const [profile, setProfile] = useState<SubscriptionServiceProfile | null>(null);
  const [gateVerified, setGateVerified] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [loadingProfile, startProfile] = useTransition();
  const [verifying, startVerify] = useTransition();

  function search() {
    setError(null);
    setSelectedSub(null);
    setProfile(null);
    setGateVerified(false);
    setVisitId(null);
    startSearch(async () => {
      const rows = await lookupMemberForVisit(query);
      setResults(rows);
      if (rows.length === 1) {
        openMember(rows[0]!);
      } else if (!rows.length) {
        setError("No active membership found. Try phone, name, plate, or member token.");
      }
    });
  }

  function openMember(sub: MemberLookupRow) {
    setSelectedSub(sub);
    setGateVerified(sub.vehicleGate.status === "verified");
    if (sub.vehicleGate.status === "blocked") {
      setStep("gatekeeper");
      return;
    }
    if (sub.vehicleGate.status === "verified") {
      loadProfile(sub);
      setStep("checklist");
    } else {
      setStep("gatekeeper");
    }
  }

  function loadProfile(sub: MemberLookupRow) {
    startProfile(async () => {
      const p = await fetchSubscriptionServiceProfile(sub.id);
      if (p) setProfile(p);
      else setError("Could not load service profile.");
    });
  }

  function handleGateVerify(opts: {
    plate?: string;
    vinLast6?: string;
    confirmCheckbox?: boolean;
  }) {
    if (!selectedSub) return;
    setError(null);
    startVerify(async () => {
      const res = await verifyVehicleGatekeeper({
        subscriptionId: selectedSub.id,
        plate: opts.plate,
        vinLast6: opts.vinLast6,
        confirmCheckbox: opts.confirmCheckbox,
      });
      if (res.ok) {
        setGateVerified(true);
        if (res.visitId) setVisitId(res.visitId);
        loadProfile(selectedSub);
        setStep("checklist");
      } else {
        setError(res.error);
      }
    });
  }

  const memberName = selectedSub
    ? selectedSub.customer.company?.trim() ||
      `${selectedSub.customer.lastName} ${selectedSub.customer.firstName}`.trim()
    : "";

  const enrolled = selectedSub?.enrolledVehicle;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <StepPill n={1} label="Find member" active={step === "find"} done={step !== "find"} />
        <div className="h-px flex-1 bg-border" />
        <StepPill
          n={2}
          label="Confirm vehicle"
          active={step === "gatekeeper"}
          done={step === "checklist" || step === "done"}
        />
        <div className="h-px flex-1 bg-border" />
        <StepPill n={3} label="Check services" active={step === "checklist"} done={step === "done"} />
      </div>

      {step === "find" ? (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="size-5 text-brand-navy" />
            <h2 className="font-semibold">Step 1 — Find member</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Search by phone, customer name, license plate, or member portal token. Plate/VIN scans
            are checked against the enrolled vehicle.
          </p>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Phone, name, plate, or token…"
              className="h-12 text-base"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button onClick={search} disabled={searching} className="shrink-0 h-12 px-5 bg-brand-navy">
              {searching ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
            </Button>
          </div>

          {results.length > 1 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Multiple matches — select one:</p>
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openMember(r)}
                  className="w-full rounded-md border p-4 text-left text-sm hover:bg-accent min-h-[56px]"
                >
                  <span className="font-medium">
                    {r.customer.lastName} {r.customer.firstName}
                  </span>
                  <span className="text-muted-foreground"> — {r.plan.name}</span>
                  {r.enrolledVehicle ? (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {enrolledVehicleDetail(r.enrolledVehicle)}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}

      {step === "gatekeeper" && selectedSub && enrolled ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="font-semibold flex items-center gap-2">
              <User className="size-5 text-brand-navy" />
              {memberName}
            </p>
            <p className="text-sm text-muted-foreground">{selectedSub.plan.name}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setStep("find");
                setSelectedSub(null);
                setProfile(null);
                setGateVerified(false);
    setVisitId(null);
              }}
            >
              Change member
            </Button>
          </div>

          {selectedSub.vehicleGate.status === "blocked" ? (
            <VehicleGateBlock gate={selectedSub.vehicleGate} enrolled={enrolled} />
          ) : (
            <VehicleGatekeeperStep
              enrolled={enrolled}
              gate={selectedSub.vehicleGate}
              large
              verifying={verifying}
              onVerified={handleGateVerify}
            />
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}

      {step === "checklist" && selectedSub && profile && enrolled ? (
        <div className="rounded-lg border-2 border-brand-navy/20 bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-red">Services</p>
              <p className="font-semibold text-lg flex items-center gap-2">
                <User className="size-5 text-brand-navy" />
                {memberName}
              </p>
              <p className="text-sm text-muted-foreground">{profile.planName}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("find");
                setSelectedSub(null);
                setProfile(null);
                setGateVerified(false);
    setVisitId(null);
              }}
            >
              Change
            </Button>
          </div>

          {gateVerified ? <VehicleVerifiedBadge enrolled={enrolled} large /> : null}

          {loadingProfile ? (
            <p className="text-sm flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading services…
            </p>
          ) : (
            <ServiceVisitFlow
              subscriptionId={selectedSub.id}
              services={profile.services}
              vehicleId={enrolled.id}
              defaultTechnicianName={defaultTechnicianName}
              visitId={visitId}
              gatekeeperVerified={gateVerified}
              large
              onProfileUpdate={setProfile}
              redirectTo={`/maintenance-programs/subscribers/${selectedSub.id}`}
            />
          )}

          <Button variant="ghost" asChild className="text-brand-navy">
            <Link href={`/maintenance-programs/subscribers/${selectedSub.id}`}>View full membership</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StepPill({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${
        active ? "text-brand-navy" : done ? "text-green-700" : "text-muted-foreground"
      }`}
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full ${
          active
            ? "bg-brand-navy text-white"
            : done
              ? "bg-green-600 text-white"
              : "bg-muted"
        }`}
      >
        {n}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
