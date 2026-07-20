import { Suspense } from "react";

import { SignupPageContent } from "@/components/marketing-site/signup-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/signup",
  title: "Reserve Ignition + AI Plus",
  description:
    "Reserve a ShopRally founding seat for the Q4 2026 launch. Ignition shop management software plus optional AI Plus — we'll invite you when we open.",
});

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
