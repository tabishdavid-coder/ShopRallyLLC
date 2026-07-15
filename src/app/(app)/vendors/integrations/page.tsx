import Link from "next/link";
import {
  Car,
  CreditCard,
  Disc3,
  History,
  Package,
  Settings2,
  Star,
} from "lucide-react";

import { VendorIntegrationCard } from "@/components/vendors/vendor-integration-card";
import {
  VENDOR_CATEGORIES,
  VENDOR_DEFINITIONS,
  type VendorKey,
} from "@/lib/integrations";
import { getShopId } from "@/lib/shop";
import { getShopSubscription } from "@/lib/subscription";
import { isIntegrationCardVisible } from "@/lib/settings-plan-gates";
import { getAllIntegrationStatuses } from "@/server/integrations";

export const metadata = { title: "Vendor Integrations — ShopRally" };
export const dynamic = "force-dynamic";

const VENDOR_ICONS: Record<VendorKey, typeof Package> = {
  partstech: Package,
  weldon: Disc3,
  carfax: History,
  "vin-decoder": Car,
  stripe: CreditCard,
  "google-reviews": Star,
};

const VENDOR_CARD_NAME: Partial<Record<VendorKey, string>> = {
  partstech: "PartsTech",
  carfax: "Carfax",
  stripe: "Stripe",
};

export default async function VendorIntegrationsPage() {
  const shopId = await getShopId();
  const sub = await getShopSubscription(shopId);
  const statuses = await getAllIntegrationStatuses();
  const byKey = new Map(statuses.map((s) => [s.key, s]));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Vendor Integrations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Connect parts, tire, vehicle history, and payment vendors per shop — your shop&apos;s
            integrated vendor hub for ordering and vehicle data. Platform env vars in{" "}
            <span className="font-mono text-xs">.env</span> still apply as a fallback; shop credentials
            here are stored server-side only.
          </p>
        </div>
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline"
        >
          <Settings2 className="size-4" />
          Platform integrations
        </Link>
      </div>

      {VENDOR_CATEGORIES.map((cat) => {
        const vendors = VENDOR_DEFINITIONS.filter((v) => {
          if (v.category !== cat.key) return false;
          const cardName = VENDOR_CARD_NAME[v.key];
          if (cardName && !isIntegrationCardVisible(cardName, sub.features, sub.plan)) {
            return false;
          }
          return true;
        });
        if (vendors.length === 0) return null;
        return (
          <section key={cat.key} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {vendors.map((vendor) => {
                const status = byKey.get(vendor.key);
                if (!status) return null;
                const Icon = VENDOR_ICONS[vendor.key];
                return (
                  <VendorIntegrationCard key={vendor.key} vendor={vendor} status={status} icon={Icon} />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
