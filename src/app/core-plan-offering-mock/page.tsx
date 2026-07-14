import { CorePlanOfferingMockup } from "@/components/pricing/core-plan-offering-mockup";

export const metadata = {
  title: "Core plan offering mockup — ShopRally",
  description:
    "Review-only breakdown of proposed Core (Ignition) plan features before system-wide pricing update.",
  robots: { index: false, follow: false },
};

/**
 * Review mock — not live /pricing.
 * Open: http://localhost:3031/core-plan-offering-mock
 */
export default function CorePlanOfferingMockPage() {
  return <CorePlanOfferingMockup />;
}
