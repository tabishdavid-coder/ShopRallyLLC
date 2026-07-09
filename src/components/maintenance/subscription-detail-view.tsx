"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Copy,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MemberDigitalCard,
} from "@/components/maintenance/subscription-progress";
import { ServiceVisitAuditTimeline } from "@/components/maintenance/service-visit-audit-timeline";
import { ServiceVisitFlow } from "@/components/maintenance/service-visit-flow";
import { ServiceTermProgressBar } from "@/components/maintenance/service-visit-checklist";
import {
  VehicleGatekeeperStep,
  VehicleVerifiedBadge,
} from "@/components/maintenance/vehicle-gatekeeper";
import { formatCents, customerDisplayName } from "@/lib/format";
import { enrolledVehicleDetail, checkVehicleGate } from "@/lib/maintenance-gatekeeper";
import {
  fetchSubscriptionServiceProfile,
  verifyVehicleGatekeeper,
} from "@/server/actions/maintenance-subscriptions";
import type { SubscriptionServiceProfile } from "@/server/maintenance-service-visits";
import type { SubscriptionDetail } from "@/server/maintenance-subscriptions";
import { cn } from "@/lib/utils";

type Props = {
  sub: SubscriptionDetail;
  profile: SubscriptionServiceProfile;
  shopName: string;
  memberUrl: string;
  defaultTechnicianName: string;
};

export function SubscriptionDetailView({
  sub,
  profile: initialProfile,
  shopName,
  memberUrl,
  defaultTechnicianName,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [gateVerified, setGateVerified] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [verifying, startVerify] = useTransition();

  const customerName = customerDisplayName(sub.customer);
  const vehicle = sub.vehicles[0]?.vehicle;
  const vehicleDetail = vehicle ? enrolledVehicleDetail(vehicle) : "—";
  const vehicleGate = vehicle
    ? checkVehicleGate(vehicle, { requireExplicitConfirm: true })
    : null;

  const paymentsPaid = sub.payments.reduce((s, p) => s + p.amountCents, 0);
  const completedVisits = profile.visits.filter((v) => v.status === "COMPLETED").length;

  function copyLink() {
    void navigator.clipboard.writeText(memberUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleGateVerify(opts: {
    plate?: string;
    vinLast6?: string;
    confirmCheckbox?: boolean;
  }) {
    setGateError(null);
    startVerify(async () => {
      const res = await verifyVehicleGatekeeper({
        subscriptionId: sub.id,
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
    <div className="space-y-6 workspace-surface">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/maintenance-programs/subscribers" className="hover:text-primary">
          Subscribers
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{customerName}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{sub.plan.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Link href={`/customers?customer=${sub.customerId}`} className="hover:text-primary hover:underline">
              {customerName}
            </Link>
          </p>
          <div className="mt-2 rounded-md border bg-brand-light/10 px-3 py-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-navy">
              Enrolled vehicle
            </p>
            <p className="font-semibold mt-0.5">{vehicleDetail}</p>
            <p className="text-xs text-on-brand-wash mt-1">
              Benefits apply to this vehicle only. Transfers require void + re-enroll.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge className={cn(sub.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-muted")}>
              {sub.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline">{sub.paymentMode.replace("_", " ")}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90">
            <Link href="/maintenance-programs/visit">Express visit</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
            {copied ? "Copied!" : <Copy className="size-3.5" />}
            Portal link
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={memberUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> Preview portal
            </a>
          </Button>
          {sub.customer.phone ? (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link href={`/messages?customerId=${sub.customerId}`}>
                <MessageSquare className="size-3.5" /> SMS
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold mb-4 text-brand-navy">Service profile</h2>
            <ServiceTermProgressBar services={profile.services} />
            <ul className="mt-4 space-y-2">
              {profile.services.map((s) => (
                <li key={s.subscriptionEntitlementId} className="flex justify-between text-sm border-b pb-2 last:border-0">
                  <span>{s.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.kind === "COUNTED" || s.kind === "COUPON"
                      ? `${s.usedCount}/${s.quantity ?? "—"} used`
                      : s.termStatus}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border-2 border-brand-navy/20 bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-brand-red" />
              <h2 className="font-semibold text-brand-navy">Service visit</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Verify the enrolled vehicle, check off services performed today, then complete the
              visit. All records are timestamped in the audit log.
            </p>

            {vehicle && vehicleGate ? (
              <>
                {gateVerified ? (
                  <div className="mb-4">
                    <VehicleVerifiedBadge enrolled={vehicle} large />
                  </div>
                ) : (
                  <div className="mb-4 space-y-2">
                    <VehicleGatekeeperStep
                      enrolled={vehicle}
                      gate={vehicleGate}
                      large
                      verifying={verifying}
                      onVerified={handleGateVerify}
                    />
                    {gateError ? <p className="text-sm text-destructive">{gateError}</p> : null}
                  </div>
                )}

                <ServiceVisitFlow
                  subscriptionId={sub.id}
                  services={profile.services}
                  vehicleId={vehicle.id}
                  defaultTechnicianName={defaultTechnicianName}
                  useVisitSession
                  visitId={visitId}
                  gatekeeperVerified={gateVerified}
                  gateLocked={!gateVerified}
                  large
                  onProfileUpdate={setProfile}
                  onComplete={() => router.refresh()}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No enrolled vehicle on this membership.
              </p>
            )}
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold mb-3">Visit audit log</h2>
            <ServiceVisitAuditTimeline
              visits={profile.visits}
              subscriptionId={sub.id}
              onVoided={async () => {
                const next = await fetchSubscriptionServiceProfile(sub.id);
                if (next) setProfile(next);
                router.refresh();
              }}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <MemberDigitalCard
            shopName={shopName}
            planName={sub.plan.name}
            memberName={customerName}
            vehicleLabel={vehicleDetail}
            token={sub.memberPortalToken}
          />

          <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span>{new Date(sub.startsAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{new Date(sub.endsAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-medium">{formatCents(paymentsPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visits</span>
              <span>{completedVisits}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
