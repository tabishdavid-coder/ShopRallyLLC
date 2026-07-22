import { FeaturesPageContent } from "@/components/marketing-site/features-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/features",
  title: "Auto repair shop management features — Ignition",
  description:
    "Full ShopRally Ignition features catalog: AI Plus, PartsTech, Carfax, Google Reviews inbox, two-way SMS, digital vehicle inspections, job board, estimates, appointments, Live Operations Daily Snapshot, and more — organized like the Features menu. Launching Q4 2026.",
});

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
