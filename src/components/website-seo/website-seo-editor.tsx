"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ExternalLink,
  Globe,
  Loader2,
  Radar,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import { GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { PLANS } from "@/lib/plans";
import type { WebsiteService } from "@/lib/website-seo";
import {
  getWebsiteBuildFormDefaults,
  publishWebsite,
  requestWebsiteBuild,
  updateWebsiteConfig,
} from "@/server/actions/website-seo";
import { saveShopCustomDomain } from "@/server/actions/seo-automation";
import type { ShopWebsiteAdmin } from "@/server/website-seo";

type Tab = "overview" | "content" | "domain" | "analytics" | "request";

const ALL_TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "domain", label: "Domain" },
  { id: "analytics", label: "Analytics" },
  { id: "request", label: "Request build" },
];

export function WebsiteSeoEditor({
  initial,
  subscriberMode = false,
  aiSeoAutopilot = false,
}: {
  initial: ShopWebsiteAdmin;
  subscriberMode?: boolean;
  aiSeoAutopilot?: boolean;
}) {
  const tabs = subscriberMode ? ALL_TABS.filter((t) => t.id !== "request") : ALL_TABS;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [published, setPublished] = useState(initial.published);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [heroHeadline, setHeroHeadline] = useState(initial.heroHeadline);
  const [heroSubtext, setHeroSubtext] = useState(initial.heroSubtext);
  const [aboutText, setAboutText] = useState(initial.aboutText);
  const [services, setServices] = useState<WebsiteService[]>(initial.services);
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(initial.googleAnalyticsId ?? "");
  const [customDomain, setCustomDomain] = useState(initial.customDomain ?? "");

  const [buildName, setBuildName] = useState("");
  const [buildEmail, setBuildEmail] = useState("");
  const [buildGoals, setBuildGoals] = useState("");
  const [buildNotes, setBuildNotes] = useState("");

  if (!initial.hasFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5 text-brand-navy" />
            {GROWTH_PRODUCTS.shopSite.label}
          </CardTitle>
          <CardDescription>
            {PLANS.ENTERPRISE.name} includes ShopSite and Local SEO. On other plans, subscribe to ShopSite
            ($59/mo), Local SEO ($79/mo), or the $119/mo bundle. SEO tooling lives in{" "}
            {GROWTH_PRODUCTS.seoAutopilot.label}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/settings/subscription">View plans &amp; add-ons</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function runAction(fn: () => Promise<{ ok: boolean; error?: string; ticketId?: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      if ("ticketId" in result && result.ticketId) {
        setMessage(`Request submitted (ticket ${result.ticketId.slice(0, 8)}…). Our team will follow up by email.`);
      } else {
        setMessage("Saved.");
      }
      router.refresh();
    });
  }

  async function loadBuildDefaults() {
    const defaults = await getWebsiteBuildFormDefaults();
    setBuildName(defaults.name);
    setBuildEmail(defaults.email);
  }

  return (
    <div className="space-y-4">
      <nav className={subnavBarClass()}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={subnavTabClass(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

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

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Site status</CardTitle>
              <CardDescription>Your public microsite at {initial.siteUrl}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={published ? "default" : "secondary"}>
                  {published ? "Published" : "Draft"}
                </Badge>
                {published ? (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={initial.siteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      View live site
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending}
                  className="bg-brand-navy hover:bg-brand-navy/90"
                  onClick={() =>
                    runAction(async () => {
                      const next = !published;
                      const result = await publishWebsite(next);
                      if (result.ok) setPublished(next);
                      return result;
                    })
                  }
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {published ? "Unpublish" : "Publish site"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sitemap:{" "}
                <a
                  href={`${initial.siteUrl}/sitemap.xml`}
                  className="text-brand-navy hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {initial.siteUrl}/sitemap.xml
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-brand-light/50 bg-brand-light/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Radar className="size-4 text-brand-navy" />
                {GROWTH_PRODUCTS.seoAutopilot.label}
              </CardTitle>
              <CardDescription>
                Meta tags, keywords, audits, Search Console, and content optimization — managed
                separately from ShopSite.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="border-brand-navy text-brand-navy">
                <Link href="/marketing/seo-automation">
                  Open {GROWTH_PRODUCTS.seoAutopilot.label}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "content" ? (
        <Card>
          <CardHeader>
            <CardTitle>Page content</CardTitle>
            <CardDescription>Hero, about, and services shown on your public microsite.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiSeoAutopilot ? (
              <p className="rounded-lg border border-brand-light/40 bg-brand-light/10 px-3 py-2 text-xs text-brand-navy">
                <Sparkles className="mr-1 inline size-3.5" />
                SEO Autopilot may AI-refine services and meta tags on the bi-weekly schedule. Review
                and edit this content before publishing — nothing goes live without your action.
              </p>
            ) : (
              <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                SEO Autopilot adds template service pages from canned jobs. Upgrade to{" "}
                {PLANS.ENTERPRISE.name} for AI-assisted copy refinement.
              </p>
            )}
            <Field label="Hero headline" value={heroHeadline} onChange={setHeroHeadline} />
            <Field label="Hero subtext" value={heroSubtext} onChange={setHeroSubtext} />
            <div className="space-y-2">
              <Label>About text</Label>
              <Textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} rows={5} />
            </div>
            <div className="space-y-3">
              <Label>Services</Label>
              {services.map((service, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Input
                    value={service.title}
                    placeholder="Service title"
                    onChange={(e) => {
                      const next = [...services];
                      next[i] = { ...next[i]!, title: e.target.value };
                      setServices(next);
                    }}
                  />
                  <Textarea
                    value={service.description}
                    placeholder="Description"
                    rows={2}
                    onChange={(e) => {
                      const next = [...services];
                      next[i] = { ...next[i]!, description: e.target.value };
                      setServices(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <SaveButton
              pending={pending}
              onClick={() =>
                runAction(() =>
                  updateWebsiteConfig({
                    heroHeadline,
                    heroSubtext,
                    aboutText,
                    servicesJson: services,
                  }),
                )
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === "domain" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-4" />
              Custom domain
            </CardTitle>
            <CardDescription>
              Point your own domain at your ShopRally microsite with a CNAME record. Verify in{" "}
              <Link href="/marketing/seo-automation" className="text-brand-navy hover:underline">
                {GROWTH_PRODUCTS.seoAutopilot.label}
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              label="Domain"
              value={customDomain}
              onChange={setCustomDomain}
              placeholder="www.yourshop.com"
            />
            {initial.customDomain ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={initial.customDomainVerified ? "default" : "secondary"}>
                  {initial.customDomainVerified ? "Verified" : "Pending DNS verification"}
                </Badge>
                <span className="text-muted-foreground">
                  CNAME target:{" "}
                  <code className="rounded bg-muted px-1 text-xs">{initial.cnameTarget}</code>
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                CNAME target will be{" "}
                <code className="rounded bg-muted px-1">{initial.cnameTarget}</code>
              </p>
            )}
            <Button
              disabled={pending}
              variant="outline"
              className="border-brand-navy text-brand-navy"
              onClick={() =>
                runAction(async () => {
                  const result = await saveShopCustomDomain(customDomain);
                  return result;
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save custom domain
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "analytics" ? (
        <Card>
          <CardHeader>
            <CardTitle>Google Analytics</CardTitle>
            <CardDescription>Optional — paste your GA4 measurement ID (G-XXXXXXXX).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Measurement ID"
              value={googleAnalyticsId}
              onChange={setGoogleAnalyticsId}
              placeholder="G-XXXXXXXXXX"
            />
            <SaveButton
              pending={pending}
              onClick={() => runAction(() => updateWebsiteConfig({ googleAnalyticsId }))}
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === "request" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand-red" />
              Managed website service
            </CardTitle>
            <CardDescription>
              Request a custom build from the ShopRally team — branding, copy, and launch. Add{" "}
              {GROWTH_PRODUCTS.seoAutopilot.label} for ongoing search optimization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <SaveButton
              pending={pending}
              label="Submit request"
              onClick={() =>
                runAction(() =>
                  requestWebsiteBuild({
                    name: buildName,
                    email: buildEmail,
                    goals: buildGoals,
                    notes: buildNotes || undefined,
                  }),
                )
              }
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
      />
      {max ? (
        <p className="text-xs text-muted-foreground">{value.length}/{max} characters</p>
      ) : null}
    </div>
  );
}

function SaveButton({
  pending,
  onClick,
  label = "Save changes",
}: {
  pending: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button disabled={pending} className="bg-brand-navy hover:bg-brand-navy/90" onClick={onClick}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
