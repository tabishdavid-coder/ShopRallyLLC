"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Shield, Wrench } from "lucide-react";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PORTALS = [
  {
    id: "shop",
    title: "Shop CRM",
    description: "Service writers, advisors, techs, and shop owners — manage repair orders, customers, and daily operations.",
    href: "/dashboard",
    icon: Wrench,
    cta: "Sign in to shop",
    accent: "border-brand-navy/20 hover:border-brand-navy/40 hover:bg-brand-navy/5",
    iconBg: "bg-brand-navy text-white",
  },
  {
    id: "platform",
    title: "Platform admin",
    description: "ShopRally operators — shop provisioning, legal compliance, and platform support.",
    href: "/platform",
    icon: Building2,
    cta: "Sign in to platform",
    accent: "border-brand-red/20 hover:border-brand-red/40 hover:bg-brand-red/5",
    iconBg: "bg-brand-red text-white",
  },
] as const;

export function LoginPageContent() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("portal") === "platform" ? "platform" : "shop";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <ShopRallyLogo href="/" size="sm" className="mx-auto" />
        <h1 className="mt-6 text-3xl font-bold text-brand-navy">Sign in to ShopRally</h1>
        <p className="mx-auto mt-2 max-w-lg text-slate-600">
          Choose where you&apos;re headed. Shop staff use the CRM; platform operators use the admin console.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {PORTALS.map((portal) => {
          const Icon = portal.icon;
          const active = highlight === portal.id;
          return (
            <Link
              key={portal.id}
              href={portal.href}
              className={cn(
                "group flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition-all",
                portal.accent,
                active && "ring-2 ring-brand-light ring-offset-2",
              )}
            >
              <div className={cn("flex size-12 items-center justify-center rounded-xl", portal.iconBg)}>
                <Icon className="size-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-brand-navy">{portal.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{portal.description}</p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-brand-navy group-hover:underline">
                {portal.cta} →
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 rounded-xl border border-brand-light/50 bg-brand-light/10 p-5 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-brand-navy/10">
          <Shield className="size-5 text-brand-navy" />
        </div>
        <p className="mt-3 text-sm font-medium text-brand-navy">Secure sign-in coming soon</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-600">
          Full Clerk authentication is on the roadmap. For now, development access routes directly to your
          shop dashboard or platform console.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" className="bg-brand-navy" asChild>
            <Link href="/dashboard">Continue to shop CRM</Link>
          </Button>
          <Button size="sm" variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/platform">Continue to platform</Link>
          </Button>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand-red hover:underline">
          Start your 14-day free trial
        </Link>
      </p>
    </div>
  );
}
