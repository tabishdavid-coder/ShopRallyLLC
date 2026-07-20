import { Suspense } from "react";

import { DemoPageContent } from "@/components/marketing-site/demo-page";

export const metadata = {
  title: "Book a demo — ShopRally",
  description:
    "Schedule a personalized walkthrough of ShopRally Ignition, or request Website & SEO setup as a separate offer.",
};

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <DemoPageContent />
    </Suspense>
  );
}
