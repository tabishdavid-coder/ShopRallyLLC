import { Building2, DollarSign, Rocket, ShieldAlert } from "lucide-react";

import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { PlatformShopsTable } from "@/components/platform/platform-shops-table";
import { getShopId } from "@/lib/shop";
import { getPlatformShopHealth } from "@/lib/platform-shop-health";
import { estimateShopMrrCents } from "@/lib/subscription";
import { getPlatformKpis, listPlatformShops } from "@/server/platform-shops";

export const metadata = { title: "Platform shops — ShopRally" };

type SearchParams = Promise<{ create?: string; invite?: string; name?: string; email?: string; phone?: string }>;

export default async function PlatformShopsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const prefillCreate =
    params.create === "1"
      ? {
          name: params.name?.trim(),
          email: params.email?.trim(),
          phone: params.phone?.trim(),
        }
      : undefined;
  const openInvite = params.invite === "1";

  const [shops, kpis, activeShopId] = await Promise.all([
    listPlatformShops(),
    getPlatformKpis(),
    getShopId(),
  ]);

  const mrrCents = shops.reduce(
    (sum, s) => sum + estimateShopMrrCents(s.plan, s.billingStatus),
    0,
  );
  const atRiskCount = shops.filter((s) => getPlatformShopHealth(s) === "at-risk").length;
  const watchCount = shops.filter((s) => getPlatformShopHealth(s) === "watch").length;

  return (
    <div className="space-y-6">
      <PlatformPageIntro
        title="Shops"
        description="Manage tiers, status, and tenant health. Open a shop CRM for customers, ROs, and reports."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard icon={Building2} label="Shops" value={kpis.shopCount} sub={`${kpis.activeShopCount} active`} />
        <PlatformKpiCard
          icon={DollarSign}
          label="MRR (stub)"
          value={`$${(mrrCents / 100).toLocaleString()}`}
          sub="Active paid subscriptions"
          isMoney
        />
        <PlatformKpiCard icon={Rocket} label="On trial" value={watchCount} sub="Watch billing health" />
        <PlatformKpiCard icon={ShieldAlert} label="At risk" value={atRiskCount} sub="Past due, suspended, or canceled" />
      </div>

      <PlatformShopsTable
        shops={shops}
        activeShopId={activeShopId}
        prefillCreate={prefillCreate}
        openInvite={openInvite}
      />
    </div>
  );
}
