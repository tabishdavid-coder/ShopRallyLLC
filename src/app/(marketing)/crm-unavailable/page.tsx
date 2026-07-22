import Link from "next/link";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { Button } from "@/components/ui/button";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/crm-unavailable",
  title: "CRM is local-only for now",
  description:
    "ShopRally CRM runs in local development while the public site is marketing-only. Reserve a founding seat for the Q4 2026 launch.",
  index: false,
  follow: false,
});

export default function CrmUnavailablePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <ShopRallyLogo href="/" size="sm" className="mx-auto" />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Marketing site
        </p>
        <h1 className="mt-3 text-3xl font-bold text-brand-navy">
          Shop CRM isn&apos;t on this site yet
        </h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          getShopRally.com is the public marketing website. The shop CRM stays in local
          development until we open Ignition in {MARKETING_LAUNCH.launchQuarter} — so you
          don&apos;t hit a half-loaded app or a confusing production build.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="bg-brand-navy" asChild>
            <Link href={marketingPrimaryHref()}>{marketingPrimaryCta()}</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/demo">See the walkthrough</Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="/">Back home</Link>
          </Button>
        </div>
        <p className="mx-auto mt-6 max-w-sm text-xs text-slate-500">
          Operators: run <code className="rounded bg-slate-100 px-1 py-0.5">npm run dev</code>{" "}
          on localhost:3031 for the full CRM. Production unlock requires{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">MARKETING_ONLY=false</code> on
          Vercel — do not flip that until CRM release is intentional.
        </p>
      </div>
    </div>
  );
}
