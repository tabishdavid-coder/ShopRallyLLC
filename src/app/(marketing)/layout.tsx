import { MarketingShell } from "@/components/marketing-site/marketing-shell";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
