import { Barlow_Condensed, DM_Sans } from "next/font/google";

import { MarketingShell } from "@/components/marketing-site/marketing-shell";

const marketingDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-marketing-display",
  display: "swap",
});

const marketingBody = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-marketing-body",
  display: "swap",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${marketingDisplay.variable} ${marketingBody.variable}`}>
      <MarketingShell>{children}</MarketingShell>
    </div>
  );
}
