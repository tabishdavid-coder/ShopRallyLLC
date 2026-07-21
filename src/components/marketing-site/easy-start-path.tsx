"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EASY_START_FRICTIONS,
  EASY_START_PROGRESS,
  FOUNDING_BENEFITS,
  STATUS_QUO_COST,
  marketingFormSubmitCta,
  marketingPrimaryHint,
  marketingSecondaryCta,
} from "@/lib/marketing-launch";
import { submitFoundingWaitlist } from "@/server/actions/marketing-leads";
import {
  WEB_PRESENCE_MARKETING,
  webPresenceInterestLabel,
  webPresenceRequestDemoHref,
} from "@/lib/web-presence-marketing";
import { cn } from "@/lib/utils";

type Step = "frictions" | "mirror" | "email";

/**
 * Guided start — UX psychology without dark patterns:
 * smart defaults · goal-gradient progress · reciprocity · endowment · soft continue CTAs.
 */
export function EasyStartPath({
  className,
  wantWebsiteSeo = false,
}: {
  className?: string;
  wantWebsiteSeo?: boolean;
}) {
  const [step, setStep] = useState<Step>("frictions");
  const [selected, setSelected] = useState<string[]>(["paper", "double"]);
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  const progress = useMemo(() => {
    if (submitted) return EASY_START_PROGRESS.done;
    if (step === "email") return EASY_START_PROGRESS.email;
    if (step === "mirror") return EASY_START_PROGRESS.mirror;
    return EASY_START_PROGRESS.frictions;
  }, [step, submitted]);

  const reliefs = useMemo(
    () =>
      EASY_START_FRICTIONS.filter((f) => selected.includes(f.id)).map((f) => f.relief),
    [selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const frictionLabels = EASY_START_FRICTIONS.filter((f) => selected.includes(f.id))
      .map((f) => f.label)
      .join("; ");
    const interests = [frictionLabels, wantWebsiteSeo ? webPresenceInterestLabel() : ""]
      .filter(Boolean)
      .join(" · ");
    start(async () => {
      const res = await submitFoundingWaitlist({
        email,
        shopName: shopName || undefined,
        interests: interests || undefined,
        source: wantWebsiteSeo ? "easy-start-path-website" : "easy-start-path",
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
      <div className={cn("rounded-2xl border-2 border-brand-navy/15 bg-white p-6 sm:p-8", className)}>
        <ProgressMeter value={100} label="You're on the list" />
        <div className="mt-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-brand-navy" />
          <h3 className="mt-4 text-xl font-bold text-brand-navy">
            Seat reserved — invite at Q4 2026 launch
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Watch <span className="font-medium text-brand-navy">{email}</span>. You don&apos;t have
            software access yet — we&apos;ll email when Ignition opens.
            {wantWebsiteSeo ? (
              <> We also noted Website &amp; SEO interest (separate from Ignition CRM).</>
            ) : null}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button className="bg-brand-navy" asChild>
              <Link href="/demo">{marketingSecondaryCta(true)}</Link>
            </Button>
            {!wantWebsiteSeo ? (
              <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
                <Link href={webPresenceRequestDemoHref()}>{WEB_PRESENCE_MARKETING.ctaPrimary}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-8 lg:grid-cols-2 lg:items-start", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Easy start</p>
        <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
          Tell us what&apos;s slowing the shop — we&apos;ll meet you there
        </h2>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Not a sales quiz. Pick what hurts most; we show how Ignition will help at launch. Then reserve
          a founding seat for Q4 2026 — login access opens then.
        </p>
        <p className="mt-4 text-sm font-medium text-slate-700">{STATUS_QUO_COST}</p>
        <ul className="mt-6 space-y-3">
          {FOUNDING_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm sm:p-8">
        <ProgressMeter value={progress} label={stepLabel(step)} />

        {step === "frictions" ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-brand-navy">What&apos;s eating your week?</p>
            <p className="mt-1 text-xs text-slate-500">
              Pick up to three — we pre-selected the two we hear most.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {EASY_START_FRICTIONS.map((f) => {
                const on = selected.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggle(f.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-left text-sm transition-colors",
                      on
                        ? "border-brand-navy bg-brand-navy text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-navy/40",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              className="mt-6 w-full gap-2 bg-brand-navy"
              onClick={() => setStep("mirror")}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}

        {step === "mirror" ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-brand-navy">Here&apos;s what that looks like in Ignition</p>
            <p className="mt-1 text-xs text-slate-500">Useful now — save your spot only if you want an invite.</p>
            <ul className="mt-4 space-y-3">
              {reliefs.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="border-brand-navy/30 text-brand-navy sm:flex-1"
                onClick={() => setStep("frictions")}
              >
                Adjust picks
              </Button>
              <Button
                type="button"
                className="gap-2 bg-brand-navy sm:flex-1"
                onClick={() => setStep("email")}
              >
                Save my path
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === "email" ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-sm font-semibold text-brand-navy">Where should we send the invite?</p>
            <p className="text-xs text-slate-500">One field required. Shop name helps us personalize — optional.</p>
            <div className="space-y-1.5">
              <Label htmlFor="easy-start-email">Work email *</Label>
              <Input
                id="easy-start-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@yourshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="easy-start-shop">Shop name</Label>
              <Input
                id="easy-start-shop"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Main Street Auto"
                className="border-slate-300"
              />
            </div>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full gap-2 bg-brand-navy">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {marketingFormSubmitCta()}
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-center text-xs text-slate-500">
              {marketingPrimaryHint(true)}{" "}
              <button
                type="button"
                className="font-semibold text-brand-navy hover:underline"
                onClick={() => setStep("mirror")}
              >
                Back
              </button>
              {" · "}
              <Link href="/demo" className="font-semibold text-brand-red hover:underline">
                Prefer a walkthrough?
              </Link>
            </p>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function stepLabel(step: Step): string {
  if (step === "frictions") return "Already exploring · next: your week";
  if (step === "mirror") return "Halfway · your Ignition snapshot";
  return "Almost done · save your invite";
}

function ProgressMeter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-brand-navy">{label}</span>
        <span className="tabular-nums text-slate-500">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-navy to-brand-light transition-[width] duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
