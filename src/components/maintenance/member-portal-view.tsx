"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import { Button } from "@/components/ui/button";
import {
  MemberDigitalCard,
  SubscriptionProgressList,
} from "@/components/maintenance/subscription-progress";
import { customerDisplayName } from "@/lib/format";
import { enrolledVehicleDetail } from "@/lib/maintenance-gatekeeper";

type Props = {
  shopName: string;
  shopPhone?: string | null;
  bookingSlug?: string | null;
  sub: {
    memberPortalToken: string;
    plan: { name: string };
    customer: { firstName: string; lastName: string; company: string | null };
    vehicles: { vehicle: { id: string; year: number | null; make: string | null; model: string | null; plate: string | null; plateState: string | null; vin: string | null } }[];
    startsAt: Date;
    endsAt: Date;
    status: string;
    entitlements: {
      id: string;
      kind: string;
      label: string;
      usedCount: number;
      remainingCount: number | null;
      quantity: number | null;
      nextEligibleAt: Date | null;
    }[];
    redemptions: { id: string; createdAt: Date; items: { id: string }[] }[];
  };
};

export function MemberPortalView({ shopName, shopPhone, bookingSlug, sub }: Props) {
  const customerName = customerDisplayName(sub.customer);
  const vehicle = sub.vehicles[0]?.vehicle;
  const vehicleLabel = vehicle ? enrolledVehicleDetail(vehicle) : "Your vehicle";

  const bookHref = bookingSlug ? `/book/${bookingSlug}` : shopPhone ? `tel:${shopPhone}` : "#";

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-brand-navy px-4 py-6 text-white">
        <div className="mx-auto max-w-md">
          <p className="text-xs uppercase tracking-widest text-white/70">Your membership</p>
          <h1 className="text-xl font-bold mt-1">{shopName}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        <MemberDigitalCard
          shopName={shopName}
          planName={sub.plan.name}
          memberName={customerName}
          vehicleLabel={vehicleLabel}
          token={sub.memberPortalToken}
        />

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold mb-1">{sub.plan.name}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Valid through {new Date(sub.endsAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-xs rounded-md bg-brand-light/20 border px-3 py-2 mb-4 text-on-brand-wash">
            Benefits apply to <strong className="text-foreground">{vehicleLabel}</strong> only.
            Contact the shop to change vehicles.
          </p>
          <SubscriptionProgressList
            items={sub.entitlements.map((e) => ({
              id: e.id,
              kind: e.kind as "COUNTED",
              label: e.label,
              usedCount: e.usedCount,
              remainingCount: e.remainingCount,
              quantity: e.quantity,
              nextEligibleAt: e.nextEligibleAt,
            }))}
          />
        </section>

        <Button className="w-full h-11 bg-brand-navy gap-2" asChild>
          <Link href={bookHref}>
            <CalendarCheck className="size-4" />
            Book a visit
          </Link>
        </Button>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-medium mb-3">Recent visits</h3>
          {sub.redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits yet — book your first service!</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sub.redemptions.map((r) => (
                <li key={r.id} className="flex justify-between text-muted-foreground">
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  <span>{r.items.length} service(s)</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Questions? {shopPhone ? (
            <a href={`tel:${shopPhone}`} className="text-brand-navy underline">{shopPhone}</a>
          ) : (
            "Contact the shop"
          )}
        </p>
      </main>

      <footer className="py-6 text-center">
        <PoweredByShopRally suffix="" />
      </footer>
    </div>
  );
}
