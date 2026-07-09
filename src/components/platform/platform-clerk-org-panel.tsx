"use client";

import { Building2 } from "lucide-react";

export function PlatformClerkOrgPanel({
  shopId,
  clerkOrgId,
}: {
  shopId: string;
  clerkOrgId: string | null;
}) {
  void shopId;

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-semibold text-brand-navy">
        <Building2 className="size-4" />
        Clerk organization
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {clerkOrgId
          ? `Linked org ${clerkOrgId}. Shop users sign in via Clerk Organizations when M1b is enabled.`
          : "No Clerk org linked yet. Create or link an organization during shop onboarding."}
      </p>
    </section>
  );
}
