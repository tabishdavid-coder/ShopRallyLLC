"use client";

import Link from "next/link";
import {
  Car,
  CreditCard,
  MessageSquare,
  Package,
  ScanBarcode,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { IntegrationsRing } from "@/components/marketing-site/IntegrationsRing";
import { Button } from "@/components/ui/button";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
  marketingPrimaryHint,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import { planMarketingDisplayName, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const ignitionName = planMarketingDisplayName(PLANS.STARTER);

type PartnerStatus = "ignition" | "expanding";

type PartnerCard = {
  name: string;
  category: string;
  accent: string;
  status: PartnerStatus;
  benefit: string;
};

const PARTNER_CARDS: PartnerCard[] = [
  {
    name: "PartsTech",
    category: "Parts catalog & punchout",
    accent: "#F26B21",
    status: "ignition",
    benefit:
      "Search vendor catalogs and drop parts straight onto the estimate — included with Ignition, not a separate subscription.",
  },
  {
    name: "CARFAX",
    category: "Service history",
    accent: "#F5C518",
    status: "ignition",
    benefit:
      "Pull service history onto the vehicle and RO so advisors see context before quoting — on every founding Ignition seat.",
  },
  {
    name: "Twilio",
    category: "Two-way SMS",
    accent: "#F22F46",
    status: "ignition",
    benefit:
      "Send estimate and approval links by text; customers reply in-thread — two-way SMS ships with Ignition at launch.",
  },
  {
    name: "NHTSA vPIC",
    category: "VIN decode",
    accent: "#1B4FA0",
    status: "ignition",
    benefit:
      "Unlimited free NHTSA VIN decode on Ignition — year/make/model/trim without a per-lookup meter on founding shops.",
  },
  {
    name: "Stripe",
    category: "Card payments",
    accent: "#635BFF",
    status: "expanding",
    benefit:
      "Stripe Connect for card capture and text-to-pay — on the Pro+ roadmap. Ignition tracks payments manually at launch.",
  },
  {
    name: "Auto.dev",
    category: "Plate & rich VIN",
    accent: "#2563EB",
    status: "expanding",
    benefit:
      "Plate→VIN lookup and richer vehicle specs — Pro and Elite. Ignition stays on NHTSA VIN plus manual entry.",
  },
  {
    name: "Nexpart",
    category: "Parts network",
    accent: "#C22026",
    status: "expanding",
    benefit:
      "Additional parts-network connectivity for shops that standardize on Nexpart — expanding as partner pipelines open.",
  },
  {
    name: "RepairLink",
    category: "OEM parts",
    accent: "#4A5568",
    status: "expanding",
    benefit:
      "OEM parts ordering for dealer-aligned workflows — on the integrations roadmap, not Ignition launch scope.",
  },
];

const SHOP_MOMENTS = [
  {
    icon: Wrench,
    title: "Estimate · PartsTech",
    body: "Advisor searches the catalog from the RO, picks the right part, and punches it onto the job — no tab-hopping to a separate ordering portal.",
  },
  {
    icon: Car,
    title: "Vehicle · CARFAX",
    body: "Service history surfaces on the vehicle sidebar before the write-up — fewer surprises when the customer says “you guys did this last year.”",
  },
  {
    icon: MessageSquare,
    title: "Approve · Twilio",
    body: "Send the digital estimate link by SMS; the customer taps approve or texts back — the thread stays on the RO, not a personal cell phone.",
  },
] as const;

function StatusBadge({ status }: { status: PartnerStatus }) {
  if (status === "ignition") {
    return (
      <span className="rounded-full border border-brand-light/40 bg-brand-light/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
        On {ignitionName}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      Expanding · Pro+
    </span>
  );
}

export function IntegrationsPageContent() {
  const preLaunch = MARKETING_LAUNCH.preLaunch;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/15 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              Partner ecosystem
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl lg:text-5xl">
              Tools your shop already trusts — wired into one login
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
              PartsTech, CARFAX, Twilio, and NHTSA VIN decode ship on {ignitionName}. Stripe
              Connect, Auto.dev, and additional parts networks expand on Pro+ as the stack grows — we
              don&apos;t claim every tile is live on founding seats.
              {preLaunch ? ` Launching ${MARKETING_LAUNCH.launchQuarter}.` : ""}
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-navy hover:bg-brand-navy/90" asChild>
              <Link href={marketingPrimaryHref(preLaunch)}>{marketingPrimaryCta({ preLaunch })}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-brand-navy text-brand-navy"
              asChild
            >
              <Link href={marketingSecondaryHref(preLaunch)}>
                {marketingSecondaryCta(preLaunch)}
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-brand-navy" asChild>
              <Link href="/features">See all features</Link>
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">{marketingPrimaryHint(preLaunch)}</p>
        </div>
      </section>

      {/* Ring centerpiece */}
      <IntegrationsRing showMicro={false} />

      {/* Partner detail grid */}
      <section
        id="partners"
        className="scroll-mt-20 border-b border-brand-navy/10 bg-white"
        aria-labelledby="partners-heading"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              Partner details
            </p>
            <h2 id="partners-heading" className="mt-2 text-3xl font-bold text-brand-navy">
              What connects — and when
            </h2>
            <p className="mt-3 text-slate-600">
              Honest scope for founding {ignitionName} vs Pro+ expansion. Partner names used for
              identification only.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_CARDS.map((partner) => (
              <li key={partner.name}>
                <article className="flex h-full flex-col rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="inline-flex size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: partner.accent }}
                      aria-hidden
                    />
                    <StatusBadge status={partner.status} />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-brand-navy">{partner.name}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {partner.category}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                    {partner.benefit}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it shows up in the shop */}
      <section
        id="in-the-shop"
        className="scroll-mt-20 border-b border-brand-navy/10 bg-gradient-to-b from-slate-50 to-white"
        aria-labelledby="moments-heading"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
              In the shop
            </p>
            <h2 id="moments-heading" className="mt-2 text-3xl font-bold text-brand-navy">
              Three moments advisors recognize
            </h2>
            <p className="mt-3 text-slate-600">
              Integrations aren&apos;t a settings page — they show up where the work happens.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {SHOP_MOMENTS.map((moment) => {
              const Icon = moment.icon;
              return (
                <article
                  key={moment.title}
                  className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-brand-navy">{moment.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{moment.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust / honesty strip */}
      <section className="border-b border-brand-navy/10 bg-brand-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-light" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-white">Honest partner representation</p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">
                  Partner logos and marks will follow each vendor&apos;s brand guidelines — many
                  shown here as typed names until official assets are approved. ShopRally is not
                  affiliated with or endorsed by partners unless explicitly stated in writing.
                </p>
              </div>
            </div>
            <div
              className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/50"
              aria-hidden
            >
              {["PartsTech", "CARFAX", "Twilio", "Stripe"].map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/95 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex items-center justify-center gap-3">
              <Package className="size-5 text-brand-light" aria-hidden />
              <ScanBarcode className="size-5 text-brand-light" aria-hidden />
              <CreditCard className="size-5 text-brand-light" aria-hidden />
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">
              One login for the bay, counter, and partners
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Reserve a founding {ignitionName} seat — PartsTech, CARFAX, two-way SMS, and NHTSA VIN
              included. We&apos;ll invite you when software opens.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className={cn("bg-brand-red hover:bg-brand-red/90 text-white")}
                asChild
              >
                <Link href={marketingPrimaryHref(preLaunch)}>
                  {marketingPrimaryCta({ preLaunch })}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-white/60">{marketingPrimaryHint(preLaunch)}</p>
          </div>
        </div>
      </section>
    </>
  );
}
