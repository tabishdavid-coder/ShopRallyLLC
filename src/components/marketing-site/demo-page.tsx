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

const FIELD_CLASS = "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400";

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
    setMessage((prev) => (prev.trim() ? prev : WEB_PRESENCE_MARKETING.intakeMessageSeed));
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
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-start lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-light">
              {needWebsite ? <Globe className="size-3.5" /> : <Play className="size-3.5" />}
              {needWebsite ? WEB_PRESENCE_MARKETING.eyebrow : "Personalized walkthrough"}
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              {needWebsite ? WEB_PRESENCE_MARKETING.intakeHeadline : "See ShopRally in action"}
            </h1>
            <p className="mt-4 max-w-lg text-white/80 leading-relaxed">
              {needWebsite
                ? WEB_PRESENCE_MARKETING.intakeSubhead
                : "Book a demo of Ignition — job board, PartsTech on the estimate, digital vehicle inspections, email approvals, appointments, and Live Operations Daily Snapshot. We'll walk the bay loop, not a Pro/Elite pitch."}
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
                  "30-minute live walkthrough of Ignition",
                  "Job board → PartsTech → estimate → email approve → invoice",
                  "Honest talk about what ships now vs later",
                  "Founding-shop pricing for early adopters",
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
                {needWebsite ? WEB_PRESENCE_MARKETING.intakeFormTitle : "Request a demo"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {needWebsite
                ? WEB_PRESENCE_MARKETING.intakeFormHint
                : "Fill out the form and we'll email you to schedule a time."}
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
                {needWebsite ? WEB_PRESENCE_MARKETING.intakeSubmit : "Request demo"}
              </Button>
              {needWebsite ? (
                <p className="text-center text-xs text-slate-500">
                  {WEB_PRESENCE_MARKETING.ctaHint}
                </p>
              ) : null}
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
