import Link from "next/link";
import { AlertTriangle, Building2, Columns3, Store, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Shop } from "@/lib/shop";

/** Warn when Neon is connected but migrations/seed were never applied. */
export function EmptyDatabaseBanner() {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold text-destructive">No shop data in the database</p>
        <p className="mt-0.5 text-muted-foreground">
          The app connected to Postgres but found zero shops. From the project root run{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:migrate</code>{" "}
          then{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:seed</code>{" "}
          and refresh this page.
        </p>
      </div>
    </div>
  );
}

/** Platform owner — operator context on Shop CRM (compliance banner). */
export function PlatformShopContextBar({ shop }: { shop: Shop }) {
  return (
    <div className="operator-mode-banner flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-brand-orange bg-brand-orange/10 px-3 py-2.5 text-sm text-brand-navy md:px-4">
      <div className="max-w-2xl">
        <p className="font-semibold tracking-tight text-brand-navy">Operator mode — Shop CRM</p>
        <p className="text-xs text-muted-foreground">
          Viewing tenant data for{" "}
          <span className="font-semibold text-brand-navy">{shop.name}</span>. Access includes
          customer PII, messages, and financials for support and onboarding only. Entry is logged in
          the platform audit trail.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="gap-1.5 border-brand-navy/20 bg-white text-brand-navy shadow-sm hover:bg-brand-navy/5 hover:text-brand-navy"
        >
          <Link href="/customers">
            <Users className="size-3.5" />
            Customers
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="gap-1.5 border-brand-navy/20 bg-white text-brand-navy shadow-sm hover:bg-brand-navy/5 hover:text-brand-navy"
        >
          <Link href="/job-board">
            <Columns3 className="size-3.5" />
            Job Board
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="gap-1.5 bg-brand-orange text-white hover:bg-brand-orange/90"
        >
          <Link href="/platform">
            <Building2 className="size-3.5" />
            Master CRM
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Shows which tenant is active so empty/wrong-shop context is obvious. */
export function ShopContextBanner({
  shop,
  customerCount,
}: {
  shop: Shop;
  customerCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand-navy text-xs font-bold text-white">
          {shop.code}
        </span>
        <div>
          <span className="font-semibold text-foreground">{shop.name}</span>
          <span className="text-muted-foreground">
            {" "}
            · {customerCount.toLocaleString()} customer{customerCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Store className="size-3.5" />
        Active shop — switch tenants from the header dropdown
      </div>
    </div>
  );
}
