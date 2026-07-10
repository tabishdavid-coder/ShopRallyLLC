import { SeoAutopilotPlanPanel } from "@/components/marketing/seo-automation/seo-autopilot-plan";
import { SEO_STRIPE_CATALOG } from "@/lib/seo-stripe-products";
import { fulfillSeoCheckoutForCurrentShop } from "@/server/services/seo-stripe-checkout";
import { revalidatePath } from "next/cache";

export default async function SeoAutopilotPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const sp = await searchParams;
  let checkoutMessage: string | null = null;
  let checkoutError: string | null = null;

  if (sp.checkout === "cancelled") {
    checkoutMessage = "Checkout cancelled — no charge was made.";
  } else if (sp.checkout === "success" && sp.session_id) {
    const result = await fulfillSeoCheckoutForCurrentShop(sp.session_id);
    if (result.ok) {
      revalidatePath("/marketing/seo-automation");
      const label = SEO_STRIPE_CATALOG[result.catalogId]?.label ?? "SEO add-on";
      checkoutMessage = result.alreadyFulfilled
        ? `${label} is already active on your shop.`
        : `${label} purchased — Growth Engine SEO is now enabled.`;
    } else {
      checkoutError = result.error;
    }
  }

  return (
    <SeoAutopilotPlanPanel checkoutMessage={checkoutMessage} checkoutError={checkoutError} />
  );
}
