"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MARKETING_LAUNCH } from "@/lib/marketing-launch";
import { PUBLIC_PLAN_ORDER, PLANS, annualSavingsDollars, planCardBullets, planDisplayPrice, planListPrice } from "@/lib/plans";
import { PricingBillingToggle } from "@/components/pricing/pricing-billing-toggle";
import type { ShopPlan } from "@/generated/prisma";
import { submitTrialSignup } from "@/server/actions/marketing-leads";
import { cn } from "@/lib/utils";

const TRIAL_DAYS = 14;

export function SignupPageContent() {
  const [plan, setPlan] = useState<ShopPlan>("STARTER");
  const [annual, setAnnual] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitTrialSignup({ name, email, shopName, phone: phone || undefined, plan });
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
        <h1 className="mt-6 text-2xl font-bold text-brand-navy">You&apos;re on the list</h1>
        <p className="mt-3 text-slate-600">
          We received your trial request for <span className="font-semibold text-brand-navy">{shopName}</span>.
          Check <span className="font-medium text-brand-navy">{email}</span> for next steps — usually within one
          business day.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Already provisioned? Sign in to your shop CRM directly.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="bg-brand-navy" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/demo">Book a demo instead</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-brand-navy sm:text-4xl">
          {MARKETING_LAUNCH.preLaunch ? (
            <>
              Request early access —{" "}
              <span className="text-brand-red">{TRIAL_DAYS}-day trial at launch</span>
            </>
          ) : (
            <>
              Start your <span className="text-brand-red">{TRIAL_DAYS}-day free trial</span>
            </>
          )}
        </h1>
        <p className="mt-3 text-slate-600">
          {MARKETING_LAUNCH.preLaunch
            ? "Tell us about your shop. Founding shops get priority onboarding and locked Ignition pricing."
            : "Start on Ignition — add AI Plus anytime for $20/mo. No credit card required for trial request."}
        </p>
      </div>

      <PricingBillingToggle
        annual={annual}
        onAnnualChange={setAnnual}
        className="mt-10"
      />

      <div className="mt-8 grid gap-4 lg:mx-auto lg:max-w-md">
        {PUBLIC_PLAN_ORDER.map((planId) => {
          const p = PLANS[planId];
          const selected = plan === planId;
          return (
            <button
              key={planId}
              type="button"
              onClick={() => setPlan(planId)}
              className={cn(
                "rounded-2xl border-2 p-5 text-left transition-all",
                selected
                  ? "border-brand-navy bg-brand-navy/5 shadow-md ring-2 ring-brand-light ring-offset-2"
                  : "border-slate-200 bg-white hover:border-brand-navy/30",
              )}
            >
              {p.popular ? (
                <span className="rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              ) : (
                <span className="invisible rounded-full px-2 py-0.5 text-[10px]">.</span>
              )}
              <h2 className="mt-2 text-lg font-bold text-brand-navy">{p.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{p.pricingCard.bestFor}</p>
              <p className="mt-2 flex flex-wrap items-end gap-x-1.5">
                {annual ? (
                  <span className="text-sm font-medium tabular-nums text-slate-400 line-through">
                    {planListPrice(p)}
                  </span>
                ) : null}
                <span className="text-2xl font-bold tabular-nums text-brand-navy">
                  {planDisplayPrice(p, annual)}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {annual
                  ? `Billed annually · save $${annualSavingsDollars(p)}/yr`
                  : "Billed monthly"}
              </p>
              <ul className="mt-4 space-y-1.5">
                {planCardBullets(p).slice(0, 4).map((h) => (
                  <li key={h} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-brand-navy" />
                    {h}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className="mx-auto mt-10 max-w-xl rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-lg font-bold text-brand-navy">Your shop details</h2>
        <p className="mt-1 text-sm text-slate-600">
          Selected plan: <span className="font-semibold text-brand-navy">{PLANS[plan].name}</span>
        </p>

        <div className="mt-6 grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-shop" className="text-slate-900">
              Shop name *
            </Label>
            <Input
              id="signup-shop"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Main Street Auto"
              required
              className="border-slate-300"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name" className="text-slate-900">
                Your name *
              </Label>
              <Input
                id="signup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-phone" className="text-slate-900">
                Phone
              </Label>
              <Input
                id="signup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-slate-300"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email" className="text-slate-900">
              Work email *
            </Label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-300"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-6 w-full gap-2 bg-brand-navy hover:bg-brand-navy/90"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Request {TRIAL_DAYS}-day trial
          <ArrowRight className="size-4" />
        </Button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Want a walkthrough first?{" "}
          <Link href="/demo" className="font-semibold text-brand-red hover:underline">
            Book a demo
          </Link>
        </p>
      </form>
    </div>
  );
}
