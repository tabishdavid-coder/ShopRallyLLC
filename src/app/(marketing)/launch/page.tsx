import { LaunchPageContent } from "@/components/marketing-site/launch-page";

export const metadata = {
  title: "Reserve a founding seat — Q4 2026 | ShopRally",
  description:
    "ShopRally Ignition launches Q4 2026. Reserve one of 50 founding seats — not available yet. Founding pricing and priority onboarding when we open.",
};

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
