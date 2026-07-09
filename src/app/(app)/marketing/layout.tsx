import { GROWTH_ENGINE, growthEnginePageTitle } from "@/lib/growth-engine-brand";

export const metadata = { title: growthEnginePageTitle() };

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}
