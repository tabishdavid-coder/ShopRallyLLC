"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { cn } from "@/lib/utils";

export function ClerkOrgSwitcher({ className }: { className?: string }) {
  if (!isClerkConfigured()) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <OrganizationSwitcher
        hidePersonal
        afterSelectOrganizationUrl="/dashboard"
        afterCreateOrganizationUrl="/onboarding/legal"
        appearance={{
          elements: {
            rootBox: "min-w-0",
            organizationSwitcherTrigger:
              "h-8 max-w-[11rem] border-white/30 bg-white/12 text-white hover:bg-white/18",
          },
        }}
      />
    </div>
  );
}
