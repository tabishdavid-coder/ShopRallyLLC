import { FeaturesPageContent } from "@/components/marketing-site/features-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/features",
  title: "Auto repair shop management features — Ignition",
  description:
    "ShopRally Ignition features for auto repair shop management: job board, PartsTech catalog & punchout, digital vehicle inspections, email estimates & approvals, canned jobs, appointments, payment tracking, and Live Operations Daily Snapshot. Launching Q4 2026.",
});

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
