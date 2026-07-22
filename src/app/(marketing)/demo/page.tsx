import { Suspense } from "react";

import { DemoPageContent } from "@/components/marketing-site/demo-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/demo",
  title: "Product walkthrough for shop management software",
  description:
    "See a 3-minute ShopRally walkthrough — job board, PartsTech, digital vehicle inspections, and email approvals for auto repair shops. Optional call if you want a live conversation.",
});

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
