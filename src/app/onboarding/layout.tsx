import type { Metadata } from "next";

import {
  LegalSiteFooter,
  LegalSiteHeader,
} from "@/components/legal/legal-document-view";

export const metadata: Metadata = {
  title: "Legal onboarding — ShopRally",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-navy/5 via-background to-background">
      <LegalSiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
      <LegalSiteFooter />
    </div>
  );
}
