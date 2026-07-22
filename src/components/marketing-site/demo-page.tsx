"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  LayoutGrid,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Phone,
  Play,
  Search,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitDemoRequest } from "@/server/actions/marketing-leads";
import {
  WEB_PRESENCE_MARKETING,
  webPresenceInterestLabel,
  webPresencePricingTabHref,
} from "@/lib/web-presence-marketing";
import { cn } from "@/lib/utils";

const BAY_OPTIONS = ["1–2 bays", "3–5 bays", "6–10 bays", "11+ bays"] as const;

const FIELD_CLASS = "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400";

type DemoMoment = {
  id: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
  preview: ReactNode;
};

/** Compact product moments shown under “See ShopRally in action”. */
const DEMO_MOMENTS: DemoMoment[] = [
  {
    id: "job-board",
    label: "Job board",
    blurb: "Estimates → WIP → Completed at a glance",
    icon: LayoutGrid,
    preview: (
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { title: "Estimates", count: "8", tone: "bg-amber-50 text-amber-900 border-amber-200/80" },
          { title: "WIP", count: "5", tone: "bg-brand-light/25 text-brand-navy border-brand-light/50" },
          { title: "Done", count: "7", tone: "bg-emerald-50 text-emerald-900 border-emerald-200/80" },
        ].map((col) => (
          <div
            key={col.title}
            className={cn("rounded-md border px-1.5 py-1.5", col.tone)}
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{col.title}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{col.count}</p>
            <div className="mt-1.5 space-y-1">
              <div className="h-1.5 rounded-sm bg-white/70" />
              <div className="h-1.5 w-4/5 rounded-sm bg-white/50" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "estimate",
    label: "Estimate + PartsTech",
    blurb: "Parts on the RO — catalog punchout in the bay loop",
    icon: Package,
    preview: (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 rounded-md border border-brand-navy/10 bg-brand-navy/[0.04] px-2 py-1.5">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-brand-navy">Brake pads · front</p>
            <p className="text-[9px] text-slate-500">Labor 1.2 hr · matrix rate</p>
          </div>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-brand-navy">$248</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-brand-light/50 bg-brand-light/15 px-2 py-1.5">
          <Package className="size-3 shrink-0 text-brand-navy" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-brand-navy">PartsTech punchout</p>
            <p className="text-[9px] text-slate-500">Pads &amp; rotors · 2 suppliers</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "dvi",
    label: "Digital vehicle inspections",
    blurb: "Photo checklists customers can see — red / yellow / green",
    icon: ClipboardCheck,
    preview: (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-brand-navy">Multi-point · RO#1038</p>
          <span className="text-[10px] font-bold text-brand-navy/70">10/12</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-navy/10">
          <div className="h-full w-[83%] rounded-full bg-brand-light" />
        </div>
        <div className="space-y-1 pt-0.5">
          {[
            { color: "bg-emerald-500", label: "Brakes — OK" },
            { color: "bg-amber-400", label: 'Tires — 4/32" tread' },
            { color: "bg-brand-red", label: "Battery — failed load" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-[10px] text-slate-600">
              <span className={cn("size-1.5 shrink-0 rounded-full", row.color)} />
              {row.label}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "approve",
    label: "Email approve → invoice",
    blurb: "Share the estimate, get the yes, finish the RO",
    icon: Mail,
    preview: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-md border border-brand-navy/15 bg-white px-2 py-1.5 shadow-sm">
          <Mail className="size-3 shrink-0 text-brand-navy" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-brand-navy">Estimate emailed</p>
            <p className="text-[9px] text-slate-500">Approval link · 2m ago</p>
          </div>
          <span className="ml-auto shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
            Opened
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
          <CheckCircle2 className="size-3 shrink-0 text-emerald-700" />
          <div>
            <p className="text-[11px] font-semibold text-emerald-900">Customer approved</p>
            <p className="text-[9px] text-emerald-700">Move to WIP · invoice ready</p>
          </div>
        </div>
      </div>
    ),
  },
];

/** Website & SEO path — companion product moments (not CRM bay-loop mocks). */
const WEBSITE_DEMO_MOMENTS: DemoMoment[] = [
  {
    id: "shopsite",
    label: "ShopSite homepage",
    blurb: "Branded shop site — services, Call, and Book on the first screen",
    icon: Globe,
    preview: (
      <div className="overflow-hidden rounded-md border border-brand-navy/15 bg-white shadow-sm">
        <div className="flex items-center gap-1 border-b border-brand-navy/8 bg-slate-50 px-2 py-1">
          <span className="size-1.5 rounded-full bg-brand-red/70" />
          <span className="size-1.5 rounded-full bg-amber-400/80" />
          <span className="size-1.5 rounded-full bg-emerald-400/80" />
          <span className="ml-1 truncate text-[8px] font-medium text-slate-400">
            mainstreetauto.shopsite
          </span>
        </div>
        <div className="bg-gradient-to-br from-brand-navy to-[#0f3d66] px-2 py-2">
          <p className="text-[10px] font-bold text-white">Main Street Auto</p>
          <p className="text-[8px] text-brand-light/90">Brakes · Oil · Diagnostics</p>
          <div className="mt-1.5 flex gap-1">
            <span className="rounded bg-brand-red px-1.5 py-0.5 text-[8px] font-bold text-white">
              Call
            </span>
            <span className="rounded bg-white/15 px-1.5 py-0.5 text-[8px] font-bold text-white">
              Book
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 px-1.5 py-1.5">
          {["Oil change", "Brakes", "A/C"].map((svc) => (
            <div
              key={svc}
              className="rounded border border-brand-navy/8 bg-brand-navy/[0.03] px-1 py-1 text-center text-[8px] font-semibold text-brand-navy"
            >
              {svc}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "gbp",
    label: "Google Business Profile",
    blurb: "Website · Directions · Call — the profile drivers actually tap",
    icon: MapPin,
    preview: (
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy text-[9px] font-bold text-white">
            MS
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-brand-navy">Main Street Auto</p>
            <p className="text-[9px] text-amber-600">★★★★★ · 128 reviews</p>
            <p className="truncate text-[8px] text-slate-500">Auto repair · Open · Closes 6 PM</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: "Website", icon: Globe },
            { label: "Directions", icon: MapPin },
            { label: "Call", icon: Phone },
          ].map((btn) => {
            const BtnIcon = btn.icon;
            return (
              <div
                key={btn.label}
                className="flex flex-col items-center gap-0.5 rounded-md border border-brand-light/50 bg-brand-light/15 px-1 py-1.5"
              >
                <BtnIcon className="size-3 text-brand-navy" />
                <span className="text-[8px] font-semibold text-brand-navy">{btn.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
  {
    id: "local-pack",
    label: "Local search pack",
    blurb: "“Auto repair near me” — Maps-style results drivers compare",
    icon: Search,
    preview: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 rounded-md border border-brand-navy/10 bg-white px-2 py-1 shadow-sm">
          <Search className="size-3 shrink-0 text-slate-400" />
          <p className="truncate text-[10px] text-slate-600">auto repair near me</p>
        </div>
        <div className="space-y-1">
          {[
            { name: "Main Street Auto", rank: "1", highlight: true },
            { name: "Quick Lube Plus", rank: "2", highlight: false },
            { name: "City Tire Shop", rank: "3", highlight: false },
          ].map((row) => (
            <div
              key={row.name}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1",
                row.highlight
                  ? "border-brand-light/60 bg-brand-light/20"
                  : "border-brand-navy/8 bg-white/80",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold",
                  row.highlight ? "bg-brand-navy text-white" : "bg-slate-200 text-slate-600",
                )}
              >
                {row.rank}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-[10px] font-semibold",
                    row.highlight ? "text-brand-navy" : "text-slate-600",
                  )}
                >
                  {row.name}
                </p>
                <p className="text-[8px] text-slate-400">0.{row.rank} mi · Open</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "local-ads",
    label: "Local Google Ads",
    blurb: "When you advertise — campaign strip for local search spend",
    icon: Megaphone,
    preview: (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 rounded-md border border-brand-navy/10 bg-brand-navy/[0.04] px-2 py-1.5">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-brand-navy">Local Search · Brakes</p>
            <p className="text-[9px] text-slate-500">Search · ZIP radius</p>
          </div>
          <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
            Active
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { k: "Clicks", v: "84" },
            { k: "Calls", v: "12" },
            { k: "CPA", v: "$18" },
          ].map((stat) => (
            <div
              key={stat.k}
              className="rounded-md border border-brand-light/40 bg-brand-light/10 px-1.5 py-1 text-center"
            >
              <p className="text-[8px] font-medium uppercase tracking-wide text-brand-navy/50">
                {stat.k}
              </p>
              <p className="text-[11px] font-bold tabular-nums text-brand-navy">{stat.v}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
          <Megaphone className="size-2.5 shrink-0 text-brand-red" />
          Tuning when ads are already running
        </div>
      </div>
    ),
  },
];

function ProductMomentsStrip({
  moments,
  eyebrow,
  title,
  blurb,
  meta,
}: {
  moments: DemoMoment[];
  eyebrow: string;
  title: string;
  blurb: string;
  meta: string;
}) {
  return (
    <div className="relative">
      {/* Soft seam: navy bleed → light wash (kills the hard white slab) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent via-brand-navy/20 to-[#e8f4ff]"
      />
      <section className="relative bg-gradient-to-b from-[#e8f4ff] via-brand-light/20 to-background pb-16 pt-4 sm:pb-20 sm:pt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/60">
                {eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-bold text-brand-navy sm:text-2xl">{title}</h2>
              <p className="mt-1.5 max-w-xl text-sm text-slate-600">{blurb}</p>
            </div>
            <p className="hidden text-xs font-medium text-brand-navy/50 sm:block">{meta}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {moments.map((moment, i) => {
              const Icon = moment.icon;
              return (
                <article
                  key={moment.id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-brand-navy/10",
                    "bg-white/90 shadow-sm shadow-brand-navy/5 backdrop-blur-sm",
                    "transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-navy/25 hover:shadow-md hover:shadow-brand-navy/10",
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-brand-navy/8 bg-brand-navy/[0.03] px-3.5 py-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-navy text-white">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-brand-navy">{moment.label}</p>
                      <p className="truncate text-[10px] font-medium text-brand-navy/45">
                        Step {i + 1}
                      </p>
                    </div>
                  </div>
                  <div className="px-3.5 py-3">
                    <div className="rounded-lg border border-brand-navy/8 bg-slate-50/80 p-2.5 transition-colors group-hover:border-brand-light/60 group-hover:bg-brand-light/10">
                      {moment.preview}
                    </div>
                    <p className="mt-2.5 text-xs leading-snug text-slate-600">{moment.blurb}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export function DemoPageContent() {
  const searchParams = useSearchParams();
  const needWebsite = searchParams.get("need") === WEB_PRESENCE_MARKETING.needQuery;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [bayCount, setBayCount] = useState("");
  const [currentSoftware, setCurrentSoftware] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitDemoRequest({
        name,
        email,
        shopName,
        phone: phone || undefined,
        bayCount: needWebsite ? undefined : bayCount || undefined,
        currentSoftware: currentSoftware || undefined,
        message: message || undefined,
        need: needWebsite ? WEB_PRESENCE_MARKETING.needQuery : undefined,
        interests: needWebsite ? webPresenceInterestLabel() : undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <CheckCircle2 className="mx-auto size-14 text-brand-navy" />
        <h1 className="mt-6 text-2xl font-bold text-brand-navy">We&apos;ll be in touch soon</h1>
        <p className="mt-3 text-slate-600">
          Thanks, {name.split(" ")[0] || "there"}. Our team will reach out at{" "}
          <span className="font-medium text-brand-navy">{email}</span>
          {needWebsite
            ? " about Website & SEO setup (separate from Ignition CRM)."
            : " if you requested a call — or enjoy the walkthrough moments below anytime."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="bg-brand-navy" asChild>
            <Link href="/launch">Reserve a founding seat instead</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section
        className={cn(
          "relative text-white",
          "bg-gradient-to-br from-brand-navy via-brand-navy to-[#0f3d66]",
          // Soften bottom edge so the moments strip wash doesn't read as a hard white break
          "pb-20 sm:pb-24",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.798_0.108_247_/_0.18),transparent_55%)]"
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-start lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-light">
              {needWebsite ? <Globe className="size-3.5" /> : <Play className="size-3.5" />}
              {needWebsite ? WEB_PRESENCE_MARKETING.eyebrow : "Ungated product story"}
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              {needWebsite
                ? WEB_PRESENCE_MARKETING.intakeHeadline
                : "See a 3-minute walkthrough"}
            </h1>
            <p className="mt-4 max-w-lg text-white/80 leading-relaxed">
              {needWebsite
                ? WEB_PRESENCE_MARKETING.intakeSubhead
                : "See Ignition in product moments — job board, PartsTech on the estimate, digital vehicle inspections, and email approvals. No gate. Optional call below if you want a live conversation."}
            </p>

            {needWebsite ? (
              <div className="mt-8 max-w-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-light/80">
                  {WEB_PRESENCE_MARKETING.intakeValueLead}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {WEB_PRESENCE_MARKETING.intakeValueMirror.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/90"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-light" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-white/60">
                  {WEB_PRESENCE_MARKETING.honestyNote}
                </p>
                <p className="mt-3 text-sm text-white/70">
                  Prefer to scan pricing first?{" "}
                  <Link
                    href={webPresencePricingTabHref()}
                    className="font-semibold text-brand-light underline-offset-2 hover:underline"
                  >
                    Website &amp; SEO on /pricing
                  </Link>
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-2 text-sm text-white/85">
                {[
                  "Product moments you can scan in about 3 minutes",
                  "Job board → PartsTech → estimate → email approve → invoice",
                  "Honest scope — Ignition at launch, not a later-roadmap pitch",
                  "Optional call if you want questions answered live",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-brand-light" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/*
            Critical: parent section is text-white. Reset dark text on the card so
            inputs are not white-on-white (looks like “can’t type”).
          */}
          <div className="rounded-2xl border border-white/15 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
            <div className="flex items-center gap-2 text-brand-navy">
              {needWebsite ? <Globe className="size-5" /> : <Calendar className="size-5" />}
              <h2 className="text-lg font-bold">
                {needWebsite ? WEB_PRESENCE_MARKETING.intakeFormTitle : "Book a call (optional)"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {needWebsite
                ? WEB_PRESENCE_MARKETING.intakeFormHint
                : "Prefer a live conversation? Leave your details — walkthrough moments below are open either way."}
            </p>

            <form onSubmit={submit} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-name" className="text-slate-900">
                    Your name *
                  </Label>
                  <Input
                    id="demo-name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-email" className="text-slate-900">
                    Work email *
                  </Label>
                  <Input
                    id="demo-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-shop" className="text-slate-900">
                  Shop name *
                </Label>
                <Input
                  id="demo-shop"
                  name="organization"
                  autoComplete="organization"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  placeholder="Main Street Auto"
                  className={FIELD_CLASS}
                />
              </div>

              {needWebsite ? (
                <div className="space-y-1.5">
                  <Label htmlFor="demo-phone" className="text-slate-900">
                    Phone <span className="font-normal text-slate-500">(optional)</span>
                  </Label>
                  <Input
                    id="demo-phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-phone" className="text-slate-900">
                      Phone
                    </Label>
                    <Input
                      id="demo-phone"
                      name="tel"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-900">Shop size</Label>
                    <Select value={bayCount} onValueChange={setBayCount}>
                      <SelectTrigger className={FIELD_CLASS}>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {BAY_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="demo-current" className="text-slate-900">
                  {needWebsite ? (
                    <>
                      Current website or Google Business Profile{" "}
                      <span className="font-normal text-slate-500">(optional)</span>
                    </>
                  ) : (
                    "Current shop software"
                  )}
                </Label>
                <Input
                  id="demo-current"
                  value={currentSoftware}
                  onChange={(e) => setCurrentSoftware(e.target.value)}
                  placeholder={
                    needWebsite
                      ? "yoursite.com or GBP link — or leave blank"
                      : "Tekmetric, Shopmonkey, pen & paper…"
                  }
                  className={FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-message" className="text-slate-900">
                  {needWebsite ? "Anything we should know?" : "Anything else?"}
                </Label>
                <Textarea
                  id="demo-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={needWebsite ? 2 : 3}
                  placeholder={
                    needWebsite
                      ? "Timeline, no site yet, ads already running… — or leave blank"
                      : "Questions for the walkthrough — or leave blank"
                  }
                  className={FIELD_CLASS}
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={pending}
                className="w-full gap-2 bg-brand-red hover:bg-brand-red/90"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {needWebsite ? WEB_PRESENCE_MARKETING.intakeSubmit : "Request a call"}
              </Button>
              {needWebsite ? (
                <p className="text-center text-xs text-slate-500">
                  {WEB_PRESENCE_MARKETING.ctaHint}
                </p>
              ) : (
                <p className="text-center text-xs text-slate-500">
                  Or skip the form — scroll to the product moments below.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Fade hero into moments wash instead of a knife-edge border */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#e8f4ff]"
        />
      </section>

      {needWebsite ? (
        <ProductMomentsStrip
          moments={WEBSITE_DEMO_MOMENTS}
          eyebrow="What we'll cover"
          title="Website & SEO moments"
          blurb="ShopSite, local presence, and ads help — companion to Ignition, not the bay loop. Hover a card to peek the UI."
          meta="Companion · billed separately"
        />
      ) : (
        <ProductMomentsStrip
          moments={DEMO_MOMENTS}
          eyebrow="3-minute product story"
          title="Ignition moments — no gate"
          blurb="Same bay loop as the live product — job board, PartsTech, inspections, approvals. Hover a card to peek the UI."
          meta="~3 min · Ignition · call optional"
        />
      )}
    </>
  );
}
