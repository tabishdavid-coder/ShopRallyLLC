"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FOUNDING_BENEFITS } from "@/lib/marketing-launch";
import { submitFoundingWaitlist } from "@/server/actions/marketing-leads";
import { cn } from "@/lib/utils";

type FoundingWaitlistFormProps = {
  variant?: "compact" | "full";
  className?: string;
};

export function FoundingWaitlistForm({ variant = "full", className }: FoundingWaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitFoundingWaitlist({
        email,
        shopName: shopName || undefined,
        name: name || undefined,
        source: variant === "compact" ? "homepage-inline" : "launch-page",
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
      <div className={cn("rounded-2xl border-2 border-brand-navy/15 bg-white p-6 text-center sm:p-8", className)}>
        <CheckCircle2 className="mx-auto size-12 text-brand-navy" />
        <h3 className="mt-4 text-xl font-bold text-brand-navy">You&apos;re on the founding list</h3>
        <p className="mt-2 text-sm text-slate-600">
          Watch <span className="font-medium text-brand-navy">{email}</span> for launch updates, early access
          invites, and founding-shop pricing details.
        </p>
        <Button className="mt-6 bg-brand-navy" asChild>
          <Link href="/demo">Book an early demo</Link>
        </Button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <form
        onSubmit={submit}
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-brand-navy/15 bg-white p-4 shadow-lg sm:flex-row sm:items-end sm:p-5",
          className,
        )}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="waitlist-email-compact" className="sr-only">
            Work email
          </Label>
          <Input
            id="waitlist-email-compact"
            type="email"
            required
            placeholder="you@yourshop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-slate-300"
          />
        </div>
        <Button type="submit" disabled={pending} className="shrink-0 gap-2 bg-brand-red hover:bg-brand-red/90">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Get early access
          <ArrowRight className="size-4" />
        </Button>
      </form>
    );
  }

  return (
    <div className={cn("grid gap-8 lg:grid-cols-2 lg:items-start", className)}>
      <div>
        <h2 className="text-2xl font-bold text-brand-navy sm:text-3xl">Join the founding shop waitlist</h2>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Be first in line when ShopRally opens — get launch updates, early demos, and locked-in founding pricing
          before we raise rates at GA.
        </p>
        <ul className="mt-6 space-y-3">
          {FOUNDING_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={submit}
        className="rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-email">Work email *</Label>
            <Input
              id="waitlist-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-shop">Shop name</Label>
            <Input
              id="waitlist-shop"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Main Street Auto"
              className="border-slate-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-name">Your name</Label>
            <Input
              id="waitlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-300"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="mt-6 w-full gap-2 bg-brand-navy">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Join waitlist — it&apos;s free
          <ArrowRight className="size-4" />
        </Button>
        <p className="mt-3 text-center text-xs text-slate-500">
          No spam. Unsubscribe anytime.{" "}
          <Link href="/demo" className="font-semibold text-brand-red hover:underline">
            Prefer a demo?
          </Link>
        </p>
      </form>
    </div>
  );
}
