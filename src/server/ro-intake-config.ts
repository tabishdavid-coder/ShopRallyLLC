import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { ADVANCED_DEFAULTS, resolveAdvanced } from "@/lib/ro-settings";
import type { RoIntakeConfig } from "@/lib/ro-intake-types";
import { getLeadSourceNames } from "@/server/actions/marketing";
import { getCustomerTagNames } from "@/server/actions/customer-settings";

const INTAKE_CONFIG_FALLBACK: RoIntakeConfig = {
  laborRates: [{ name: "Standard labor rate", rateCents: 15000, isDefault: true }],
  leadSources: [],
  customerTags: [],
  defaultMarketingOptIn: false,
  advanced: ADVANCED_DEFAULTS,
};

/** Load intake form config for the active shop (server components + layout). */
export async function loadRoIntakeConfig(shopId?: string): Promise<RoIntakeConfig> {
  try {
    const id = shopId ?? (await getShopId());
    const [shop, rates, leadSources, customerTags] = await Promise.all([
      prisma.shop.findUnique({
        where: { id },
        select: { laborRateCents: true, defaultMarketingOptIn: true, roAdvanced: true },
      }),
      prisma.laborRate.findMany({ where: { shopId: id }, orderBy: { sortOrder: "asc" } }),
      getLeadSourceNames(),
      getCustomerTagNames(),
    ]);

    const fallback = shop?.laborRateCents ?? 15000;
    const laborRates = rates.length
      ? rates.map((r) => ({ name: r.name, rateCents: r.rateCents, isDefault: r.isDefault }))
      : [{ name: "Standard labor rate", rateCents: fallback, isDefault: true }];

    return {
      laborRates,
      leadSources,
      customerTags,
      defaultMarketingOptIn: shop?.defaultMarketingOptIn ?? false,
      advanced: resolveAdvanced(shop?.roAdvanced),
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[loadRoIntakeConfig] using fallback after DB error:", err);
    }
    return INTAKE_CONFIG_FALLBACK;
  }
}
