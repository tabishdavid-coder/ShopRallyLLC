import { IntegrationsPageContent } from "@/components/marketing-site/integrations-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/integrations",
  title: "Partner integrations — PartsTech, CARFAX, Twilio & more",
  description:
    "ShopRally Ignition connects PartsTech catalog punchout, CARFAX service history, Twilio two-way SMS, and unlimited NHTSA VIN decode in one login. Stripe Connect and Auto.dev expand on Pro+. Launching Q4 2026.",
});

export default function IntegrationsPage() {
  return <IntegrationsPageContent />;
}
