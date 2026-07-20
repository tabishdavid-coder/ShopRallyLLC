import { Suspense } from "react";

import { LoginPageContent } from "@/components/marketing-site/login-page";
import { isMarketingOnlyProduction } from "@/lib/marketing-prod-gate";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/login",
  title: "Sign in",
  description: "Sign in to your ShopRally shop CRM or platform admin dashboard.",
  index: false,
  follow: false,
});

export default function LoginPage() {
  const marketingOnlyProduction = isMarketingOnlyProduction();

  return (
    <Suspense>
      <LoginPageContent marketingOnlyProduction={marketingOnlyProduction} />
    </Suspense>
  );
}
