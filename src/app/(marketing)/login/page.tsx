import { Suspense } from "react";

import { LoginPageContent } from "@/components/marketing-site/login-page";
import { isMarketingOnlyProduction } from "@/lib/marketing-prod-gate";

export const metadata = {
  title: "Sign in — ShopRally",
  description: "Sign in to your shop CRM or platform admin dashboard.",
};

export default function LoginPage() {
  const marketingOnlyProduction = isMarketingOnlyProduction();

  return (
    <Suspense>
      <LoginPageContent marketingOnlyProduction={marketingOnlyProduction} />
    </Suspense>
  );
}
