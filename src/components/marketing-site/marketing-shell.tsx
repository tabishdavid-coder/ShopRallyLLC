import { MarketingFooter } from "@/components/marketing-site/marketing-footer";
import { MarketingHeader } from "@/components/marketing-site/marketing-header";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sr-marketing-type flex min-h-screen flex-col bg-gradient-to-b from-brand-light/10 via-background to-background">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
