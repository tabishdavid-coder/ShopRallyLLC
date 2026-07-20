"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/features", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/features") return pathname === "/features" || pathname.startsWith("/features/");
  if (href === "/pricing") return pathname === "/pricing";
  if (href === "/demo") return pathname === "/demo";
  return pathname === href;
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const primaryHref = marketingPrimaryHref(preLaunch);
  const primaryLabel = marketingPrimaryCta({ preLaunch });

  return (
    <header className="sticky top-0 z-40 border-b border-brand-navy/10 bg-white/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-3.5 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center justify-start">
          <ShopRallyLogo />
        </div>

        <nav className="hidden items-center justify-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href || isNavActive(pathname, item.href)
                  ? "bg-brand-navy/10 text-brand-navy"
                  : "text-slate-600 hover:bg-brand-light/20 hover:text-brand-navy",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-2 md:flex">
          <Button variant="ghost" size="sm" className="text-brand-navy" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" className="bg-brand-navy hover:bg-brand-navy/90" asChild>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="justify-self-end rounded-lg p-2 text-brand-navy md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-brand-navy/10 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-light/20"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-light/20"
            >
              Sign in
            </Link>
            <Link
              href={primaryHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-brand-navy px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              {primaryLabel}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
