"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Globe, Loader2, Play } from "lucide-react";

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
import { SUPPORT_EMAIL } from "@/lib/support";
import {
  WEB_PRESENCE_MARKETING,
  webPresenceInterestLabel,
  webPresencePricingTabHref,
} from "@/lib/web-presence-marketing";

const BAY_OPTIONS = ["1–2 bays", "3–5 bays", "6–10 bays", "11+ bays"] as const;

const WEBSITE_MESSAGE_SEED =
  "I'm interested in ShopSite + Local SEO (separate from Ignition CRM) — including Google Business Profile and local Google Ads optimization when applicable. Please follow up about website & SEO setup.";

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

  useEffect(() => {
    if (!needWebsite) return;
    setMessage((prev) => (prev.trim() ? prev : WEBSITE_MESSAGE_SEED));
  }, [needWebsite]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitDemoRequest({
        name,
        email,
        shopName,
        phone: phone || undefined,
        bayCount: bayCount || undefined,
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
            : " to schedule your personalized demo."}
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
      <section className="border-b border-brand-navy/10 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/90 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-light">
              {needWebsite ? <Globe className="size-3.5" /> : <Play className="size-3.5" />}
              {needWebsite ? WEB_PRESENCE_MARKETING.eyebrow : "Personalized walkthrough"}
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              {needWebsite ? "Request Website & SEO setup" : "See ShopRally in action"}
            </h1>
            <p className="mt-4 max-w-lg text-white/80 leading-relaxed">
              {needWebsite
                ? "Tell us about your shop — we&apos;ll follow up on ShopSite and Local SEO as a companion offer, billed separately from Ignition CRM. Not a Pro/Elite pitch."
                : "Book a demo of Ignition — job board, PartsTech on the estimate, digital vehicle inspections, email approvals, appointments, and Live Operations Daily Snapshot. We&apos;ll walk the bay loop, not a Pro/Elite pitch."}
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/85">
              {(needWebsite
                ? [
                    "ShopSite + Local SEO — separate from Ignition pricing",
                    "Google Business Profile + organic local presence; Ads optimization if you already run them",
                    "High-level site + local presence setup (not every SEO Autopilot feature; no ranking/ROI promises)",
                    "Honest talk about launch timing vs CRM founding seats",
                    "Optional: reserve Ignition CRM on the same conversation",
                  ]
                : [
                    "30-minute live walkthrough of Ignition",
                    "Job board → PartsTech → estimate → email approve → invoice",
                    "Honest talk about what ships now vs later",
                    "Founding-shop pricing for early adopters",
                  ]
              ).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-brand-light" />
                  {item}
                </li>
              ))}
            </ul>
            {needWebsite ? (
              <p className="mt-4 text-sm text-white/70">
                Prefer to scan pricing first?{" "}
                <Link href={webPresencePricingTabHref()} className="font-semibold text-brand-light underline-offset-2 hover:underline">
                  Website &amp; SEO on /pricing
                </Link>
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/15 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-2 text-brand-navy">
              <Calendar className="size-5" />
              <h2 className="text-lg font-bold">
                {needWebsite ? "Request Website & SEO" : "Request a demo"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {needWebsite
                ? "Separate from Ignition CRM — fill this out and we&apos;ll email you about site + SEO setup."
                : "Fill out the form and we&apos;ll email you to schedule a time."}
            </p>

            <form onSubmit={submit} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-name" className="text-slate-900">
                    Your name *
                  </Label>
                  <Input
                    id="demo-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-email" className="text-slate-900">
                    Email *
                  </Label>
                  <Input
                    id="demo-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-shop" className="text-slate-900">
                  Shop name *
                </Label>
                <Input
                  id="demo-shop"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  className="border-slate-300"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-phone" className="text-slate-900">
                    Phone
                  </Label>
                  <Input
                    id="demo-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900">Shop size</Label>
                  <Select value={bayCount} onValueChange={setBayCount}>
                    <SelectTrigger className="border-slate-300">
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

              <div className="space-y-1.5">
                <Label htmlFor="demo-current" className="text-slate-900">
                  Current shop software
                </Label>
                <Input
                  id="demo-current"
                  value={currentSoftware}
                  onChange={(e) => setCurrentSoftware(e.target.value)}
                  placeholder="Tekmetric, Shopmonkey, pen & paper…"
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-message" className="text-slate-900">
                  Anything else?
                </Label>
                <Textarea
                  id="demo-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="border-slate-300"
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
                {needWebsite ? WEB_PRESENCE_MARKETING.ctaPrimary : "Request demo"}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              Prefer email?{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-navy hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
