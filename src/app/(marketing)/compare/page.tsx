import { CompareHubContent } from "@/components/marketing-site/compare-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/compare",
  title: "Compare ShopRally to other shop management software",
  description:
    "Compare ShopRally Ignition to Tekmetric, AutoLeap, and Shopmonkey. Honest category pages for shops evaluating a switch — PartsTech and digital vehicle inspections included at founding pricing. Launching Q4 2026.",
});

export default function CompareHubPage() {
  return <CompareHubContent />;
}
