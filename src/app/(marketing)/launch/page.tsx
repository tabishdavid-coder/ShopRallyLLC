import { LaunchPageContent } from "@/components/marketing-site/launch-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/launch",
  title: "Reserve a founding seat — Q4 2026 launch",
  description:
    "ShopRally Ignition launches Q4 2026. Reserve a founding seat for auto repair shop management software — founding pricing and priority onboarding when we open. Free, no card required.",
});

type LaunchPageProps = {
  searchParams?: Promise<{ from?: string; need?: string }>;
};

export default async function LaunchPage({ searchParams }: LaunchPageProps) {
  const params = searchParams ? await searchParams : {};
  return (
    <LaunchPageContent
      fromApp={params.from === "app"}
      wantWebsiteSeo={params.need === "website"}
    />
  );
}
