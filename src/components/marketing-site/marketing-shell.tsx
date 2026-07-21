import { MarketingFooter } from "@/components/marketing-site/marketing-footer";
import { MarketingHeader } from "@/components/marketing-site/marketing-header";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
