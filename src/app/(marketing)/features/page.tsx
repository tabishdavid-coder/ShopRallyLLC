import { FeaturesPageContent } from "@/components/marketing-site/features-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/features",
  title: "Features — job board, PartsTech, inspections & estimates",
  description:
    "ShopRally features for auto repair shops: job board, PartsTech catalog & punchout, digital vehicle inspections, email estimates & approvals, canned jobs, appointments, payment tracking, and Live Operations Daily Snapshot. Ignition launches Q4 2026.",
});

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
