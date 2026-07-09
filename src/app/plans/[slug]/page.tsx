import { notFound } from "next/navigation";

import { PlansCatalog } from "@/components/plans/plans-catalog";
import { parsePlansPreviewParams } from "@/lib/plans-page-theme";
import { isStripeEnabled } from "@/lib/stripe";
import { getShopByPlansSlug } from "@/server/maintenance-programs";
import { getCheckoutStripeContext } from "@/server/services/stripe-connect";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getShopByPlansSlug(slug);
  if (!data) return { title: "Maintenance plans" };
  return {
    title: `Maintenance plans — ${data.shop.name}`,
    description: data.settings.heroSubtitle ?? `VIP maintenance packages from ${data.shop.name}`,
  };
}

export default async function PublicPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const preview = parsePlansPreviewParams(sp);
  const isPreview = preview !== null;

  const data = await getShopByPlansSlug(slug, { allowDisabled: isPreview });
  if (!data) notFound();

  const checkoutCtx = isStripeEnabled()
    ? await getCheckoutStripeContext(data.settings.shopId)
    : null;
  const stripeCheckoutAvailable = checkoutCtx?.canCheckout === true;

  return (
    <PlansCatalog
      shop={data.shop}
      settings={data.settings}
      plans={data.plans}
      stripeCheckoutAvailable={stripeCheckoutAvailable}
      previewOverrides={
        preview
          ? { template: preview.template, themeConfig: preview.themeConfig }
          : undefined
      }
    />
  );
}
