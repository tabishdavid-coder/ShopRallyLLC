import { HomePageContent } from "@/components/home/home-page";
import { MarketingHomeJsonLd } from "@/components/marketing-site/marketing-json-ld";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/",
  absoluteTitle: true,
  title: "ShopRally — Auto repair software that runs the bay and the counter",
  description:
    "ShopRally Ignition is all-in-one auto repair shop management — job board, PartsTech estimates, CARFAX, two-way texting, inspections, and appointments in one login. $99.99/mo, everything included. Launching Q4 2026 — reserve a founding seat.",
});

export default function HomePage() {
  return (
    <>
      <MarketingHomeJsonLd />
      <HomePageContent />
    </>
  );
}
