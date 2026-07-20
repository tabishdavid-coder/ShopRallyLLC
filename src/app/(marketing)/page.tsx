import { HomePageContent } from "@/components/marketing-site/home-page";
import { MarketingHomeJsonLd } from "@/components/marketing-site/marketing-json-ld";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/",
  absoluteTitle: true,
  title: "ShopRally — Auto repair shop management software",
  description:
    "ShopRally is all-in-one auto repair shop management software — cloud shop CRM that runs the bay and the counter. Ignition launches Q4 2026 at $89.99 monthly · $84.99 annual with PartsTech and digital vehicle inspections included. Reserve a founding seat.",
});

export default function HomePage() {
  return (
    <>
      <MarketingHomeJsonLd />
      <HomePageContent />
    </>
  );
}
