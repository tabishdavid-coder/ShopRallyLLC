import { MarketingGa } from "@/components/marketing-site/marketing-ga";
import { MarketingShell } from "@/components/marketing-site/marketing-shell";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingGa />
      <MarketingShell>{children}</MarketingShell>
    </>
  );
}
