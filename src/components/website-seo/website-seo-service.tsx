"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarCheck,
  ChevronDown,
  Globe,
  Loader2,
  MapPin,
  Radar,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GROWTH_ENGINE, GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { WebPresenceLaunchSetupDetails } from "@/components/marketing-site/web-presence-launch-setup-details";
import {
  PLANS,
  WEB_PRESENCE_SERVICES,
  formatWebPresenceSetupCents,
  webPresenceSetupFootnote,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  getWebsiteBuildFormDefaults,
  requestWebsiteBuild,
} from "@/server/actions/website-seo";
import type { ShopWebsiteAdmin } from "@/server/website-seo";
import { WebsiteSeoEditor } from "./website-seo-editor";

const INCLUDED = [
  {
    icon: Globe,
    title: "Custom shop website",
    description: "Professional, mobile-friendly site branded with your shop name, services, and story.",
  },
  {
    icon: MapPin,
    title: "Location & contact pages",
    description: "Hours, address, phone, and booking CTA — ready for customers to find you.",
  },
  {
    icon: CalendarCheck,
    title: "Online booking integration",
    description: "Your ShopRally booking link embedded — customers schedule directly from your site.",
  },
  {
    icon: Sparkles,
    title: "Custom domain support",
    description: "Use your own domain with DNS setup and verification via Growth Engine.",
  },
];

export function WebsiteSeoServicePage({
  admin,
  aiSeoAutopilot = false,
}: {
  admin: ShopWebsiteAdmin;
  aiSeoAutopilot?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [buildName, setBuildName] = useState("");
  const [buildEmail, setBuildEmail] = useState("");
  const [buildGoals, setBuildGoals] = useState("");
  const [buildNotes, setBuildNotes] = useState("");

  async function loadBuildDefaults() {
    const defaults = await getWebsiteBuildFormDefaults();
    setBuildName(defaults.name);
    setBuildEmail(defaults.email);
  }

  function submitQuoteRequest() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestWebsiteBuild({
        name: buildName,
        email: buildEmail,
        goals: buildGoals,
        notes: buildNotes || undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      if (result.ticketId) {
        setMessage(
          `Quote request submitted (ticket ${result.ticketId.slice(0, 8)}…). Our team will follow up by email.`,
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/80 px-6 py-8 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-8 shrink-0 text-brand-light" />
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">
              {GROWTH_PRODUCTS.shopSite.label} — your shop on the web
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Part of {GROWTH_ENGINE.name}: publish your microsite, edit content, and connect a custom
              domain. For search rankings and automated optimization, use{" "}
              {GROWTH_PRODUCTS.seoAutopilot.label}.
            </p>
            {admin.hasFeature ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 bg-white/15 text-white hover:bg-white/25"
                >
                  <Link href="/marketing/seo-automation">
                    <Radar className="size-3.5" />
                    {GROWTH_PRODUCTS.seoAutopilot.label}
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s included</CardTitle>
              <CardDescription>
                A professional shop website — not a DIY builder. SEO is handled by{" "}
                {GROWTH_PRODUCTS.seoAutopilot.label}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {INCLUDED.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-light/20">
                      <item.icon className="size-4 text-brand-navy" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-brand-light/40 bg-brand-light/5">
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-semibold text-brand-navy">
                Monthly subscriptions · included on {PLANS.ENTERPRISE.name}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {WEB_PRESENCE_SERVICES.filter((s) => s.id !== "web-seo-bundle-monthly").map((s) => (
                  <li key={s.id}>
                    <span className="font-medium text-brand-navy">{s.name}</span> — {s.priceLabel}
                    <span className="text-slate-500"> · {webPresenceSetupFootnote(s.setupCents)}</span>
                  </li>
                ))}
                <li>
                  <span className="font-medium text-brand-navy">Bundle</span> —{" "}
                  {WEB_PRESENCE_SERVICES.find((s) => s.id === "web-seo-bundle-monthly")?.priceLabel ?? "$199/mo"}
                  <span className="text-slate-500">
                    {" "}
                    · + {formatWebPresenceSetupCents(WEB_PRESENCE_SERVICES.find((s) => s.id === "web-seo-bundle-monthly")!.setupCents)} launch setup (once)
                  </span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                {PLANS.ENTERPRISE.name} includes monthly fees and launch setup. CRM plans have no setup fee.
              </p>
              <WebPresenceLaunchSetupDetails className="max-w-none" />
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand-red" />
              Request a custom build
            </CardTitle>
            <CardDescription>
              Tell us about your shop and goals. We&apos;ll send a custom proposal within 1–2 business days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void loadBuildDefaults()}>
              Prefill from my account
            </Button>
            <Field label="Your name" value={buildName} onChange={setBuildName} />
            <Field label="Email" value={buildEmail} onChange={setBuildEmail} />
            <div className="space-y-2">
              <Label>Goals &amp; requirements</Label>
              <Textarea
                value={buildGoals}
                onChange={(e) => setBuildGoals(e.target.value)}
                rows={4}
                placeholder="Describe your ideal website, target customers, services to highlight…"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional notes (optional)</Label>
              <Textarea value={buildNotes} onChange={(e) => setBuildNotes(e.target.value)} rows={2} />
            </div>
            <Button
              disabled={pending}
              className="w-full bg-brand-navy hover:bg-brand-navy/90"
              onClick={submitQuoteRequest}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Get started
            </Button>
          </CardContent>
        </Card>
      </div>

      {admin.hasFeature ? (
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ChevronDown
                className={cn("size-4 transition-transform", advancedOpen && "rotate-180")}
              />
              Manage your ShopSite
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <WebsiteSeoEditor initial={admin} subscriberMode aiSeoAutopilot={aiSeoAutopilot} />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
