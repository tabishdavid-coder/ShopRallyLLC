"use client";

import { ClerkProvider } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk-auth-client";

export function ShopRallyClerkProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) {
    return <>{children}</>;
  }

  const afterSignIn = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL?.trim() || "/home";
  const afterSignUp = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL?.trim() || "/home";

  return (
    <ClerkProvider
      signInFallbackRedirectUrl={afterSignIn}
      signUpFallbackRedirectUrl={afterSignUp}
    >
      {children}
    </ClerkProvider>
  );
}
