"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_PLUS_MARKETING,
  MARKETING_LAUNCH,
  STATUS_QUO_COST,
  marketingFormSubmitCta,
  marketingPrimaryCta,
  marketingPrimaryHint,
} from "@/lib/marketing-launch";
import {
  PLANS,
  PHASE_ONE_LAUNCH,
  aiPlusMonthlyDollars,
  aiPlusPriceLabel,
  planCardBullets,
  planDisplayPrice,
  planMarketingDisplayName,
  shoprallyStarterMonthly,
} from "@/lib/plans";
import { submitTrialSignup } from "@/server/actions/marketing-leads";
import { cn } from "@/lib/utils";

const TRIAL_DAYS = 14;
const START_PROGRESS = 30;

export function SignupPageContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  /** Default ON — sell Ignition + AI Plus together. */
  const [wantAiPlus, setWantAiPlus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    const ai = searchParams.get("ai");
    if (ai === "0" || ai === "false") setWantAiPlus(false);
    if (ai === "1" || ai === "true") setWantAiPlus(true);
  }, [searchParams]);

  const ignition = PLANS.STARTER;
  const ignitionName = planMarketingDisplayName(ignition);
  const progress = submitted ? 100 : step === "confirm" ? 75 : START_PROGRESS;
  const ignitionMo = shoprallyStarterMonthly(true);
  const bundleMo = ignitionMo + aiPlusMonthlyDollars();

  function goConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!shopName.trim() || !name.trim() || !email.trim()) {
      setError("Shop name, your name, and email are required.");
      return;
    }
    setStep("confirm");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitTrialSignup({
        name,
        email,
        shopName,
        plan: "STARTER",
        wantAiPlus,
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
        <h1 className="mt-6 text-2xl font-bold text-brand-navy">Seat reserved — launch Q4 2026</h1>
        <p className="mt-3 text-slate-600">
          We saved{" "}
          <span className="font-semibold text-brand-navy">
            {wantAiPlus ? `${ignitionName} + AI Plus` : ignitionName}
          </span>{" "}
          interest for <span className="font-semibold text-brand-navy">{shopName}</span>. You don&apos;t
          have software access yet — check{" "}
          <span className="font-medium text-brand-navy">{email}</span> when we invite founding shops at
          launch. Nothing charged.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="bg-brand-navy" asChild>
            <Link href="/login">Already have access? Sign in</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/demo">See it first — book a demo</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-brand-navy sm:text-4xl">
          {MARKETING_LAUNCH.preLaunch ? (
            <>Continue with {ignitionName}</>
          ) : (
            <>
              {marketingPrimaryCta({ preLaunch: false })} —{" "}
              <span className="text-brand-red">{TRIAL_DAYS}-day free trial</span>
            </>
          )}
        </h1>
        <p className="mt-3 text-slate-600">
          {MARKETING_LAUNCH.preLaunch
            ? `This reserves a founding seat for ${MARKETING_LAUNCH.launchQuarter} — not instant access. Most shops include AI Plus; turn it off if you only want Ignition.`
            : "Most shops start with AI Plus on — paste a note, get a draft RO. You can turn it off below if you only want Ignition."}
        </p>
        <p className="mt-2 text-sm text-slate-500">{STATUS_QUO_COST}</p>
      </div>

      <div className="mx-auto mt-10 max-w-xl">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-brand-navy">
              {step === "details" ? "You're already exploring · shop details" : "Confirm & continue"}
            </span>
            <span className="tabular-nums text-slate-500">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-navy to-brand-light transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-brand-navy/15 bg-brand-light/10 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">{ignitionName}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">
                {planDisplayPrice(ignition, true)}
                <span className="text-sm font-normal text-slate-500">/mo annual</span>
              </p>
            </div>
            {wantAiPlus ? (
              <p className="text-sm font-semibold tabular-nums text-brand-navy">
                + AI Plus → ${bundleMo.toFixed(2)}/mo
              </p>
            ) : (
              <p className="text-xs text-slate-500">AI Plus off — add anytime for {aiPlusPriceLabel()}</p>
            )}
          </div>
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {planCardBullets(ignition)
              .slice(0, 4)
              .map((h) => (
                <li key={h} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand-navy" />
                  {h}
                </li>
              ))}
          </ul>
          {PHASE_ONE_LAUNCH ? (
            <p className="mt-3 text-xs text-slate-500">
              Pro & Elite come later — we won&apos;t upsell you through a tier maze today.
            </p>
          ) : null}
        </div>

        {/* AI Plus — default on */}
        <button
          type="button"
          onClick={() => setWantAiPlus((v) => !v)}
          className={cn(
            "mb-6 w-full rounded-2xl border-2 p-5 text-left transition-all",
            wantAiPlus
              ? "border-brand-navy bg-brand-navy/[0.04] shadow-md ring-2 ring-brand-light/60 ring-offset-2"
              : "border-slate-200 bg-white hover:border-brand-navy/30",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2",
                  wantAiPlus ? "border-brand-navy bg-brand-navy text-white" : "border-slate-300",
                )}
                aria-hidden
              >
                {wantAiPlus ? <Check className="size-3.5" /> : null}
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-brand-navy">
                  <Sparkles className="size-3.5 text-brand-red" aria-hidden />
                  Include AI Plus
                  <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">
                    Recommended
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Freeform RO intake, labor-hour assist, and the advisor app —{" "}
                  <span className="font-semibold text-brand-navy">{aiPlusPriceLabel()}</span>.{" "}
                  {AI_PLUS_MARKETING.easeLine}
                </p>
              </div>
            </div>
          </div>
          {wantAiPlus ? (
            <ul className="mt-3 grid gap-1 border-t border-brand-navy/10 pt-3 sm:grid-cols-2">
              {AI_PLUS_MARKETING.benefits.slice(0, 4).map((b) => (
                <li key={b.title} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                  <Check className="mt-0.5 size-3 shrink-0 text-brand-navy" />
                  {b.title}
                </li>
              ))}
            </ul>
          ) : null}
        </button>

        {step === "details" ? (
          <form
            onSubmit={goConfirm}
            className="rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-lg font-bold text-brand-navy">Your shop</h2>
            <p className="mt-1 text-sm text-slate-600">Defaults are set. Just fill what&apos;s yours.</p>

            <div className="mt-6 grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-shop">Shop name *</Label>
                <Input
                  id="signup-shop"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Main Street Auto"
                  required
                  autoComplete="organization"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-name">Your name *</Label>
                <Input
                  id="signup-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Work email *</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@yourshop.com"
                  className="border-slate-300"
                />
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="mt-6 w-full gap-2 bg-brand-navy">
              Continue
              <ArrowRight className="size-4" />
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">
              {marketingPrimaryHint(MARKETING_LAUNCH.preLaunch)}{" "}
              <Link href="/demo" className="font-semibold text-brand-red hover:underline">
                Prefer a walkthrough?
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-brand-navy">Looks right?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Confirm and we&apos;ll {MARKETING_LAUNCH.preLaunch ? "save your founding invite" : "start your trial"}
              .
            </p>
            <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Shop</dt>
                <dd className="font-medium text-brand-navy">{shopName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Contact</dt>
                <dd className="font-medium text-brand-navy">{name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-brand-navy">{email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Bundle</dt>
                <dd className="font-medium text-brand-navy">
                  {wantAiPlus ? `${ignitionName} + AI Plus` : `${ignitionName} only`}
                </dd>
              </div>
            </dl>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="border-brand-navy/30 text-brand-navy sm:flex-1"
                onClick={() => setStep("details")}
              >
                Edit
              </Button>
              <Button type="submit" disabled={pending} className="gap-2 bg-brand-navy sm:flex-1">
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {wantAiPlus
                  ? AI_PLUS_MARKETING.ctaWithAi
                  : MARKETING_LAUNCH.preLaunch
                    ? marketingFormSubmitCta()
                    : marketingPrimaryCta({ preLaunch: false })}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
