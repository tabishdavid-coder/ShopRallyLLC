import { Suspense } from "react";

import { LoginPageContent } from "@/components/marketing-site/login-page";

export const metadata = {
  title: "Sign in — ShopRally",
  description: "Sign in to your shop CRM or platform admin dashboard.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
