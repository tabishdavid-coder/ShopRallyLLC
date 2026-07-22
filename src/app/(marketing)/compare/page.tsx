import { CompareHubContent } from "@/components/marketing-site/compare-hub";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/compare",
  title: "Compare ShopRally to other shop management software",
  description:
    "Compare ShopRally Ignition to Tekmetric, AutoLeap, Shopmonkey, ARI, Garage360, Torque360, Shop-Ware, and RepairShopr. Honest category pages for shops evaluating a switch — PartsTech, Carfax, two-way SMS, Google Reviews inbox, and digital vehicle inspections included at founding pricing. Launching Q4 2026.",
});

export default function CompareHubPage() {
  return <CompareHubContent />;
}
