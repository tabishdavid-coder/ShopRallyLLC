"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake } from "lucide-react";

import {
  MEMBERSHIP_TAB_LABEL,
  MEMBERSHIP_TAB_SHORT,
} from "@/lib/care-plan-labels";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import type { RoTabBadges } from "@/lib/ro-phases";

import { RoPhaseStepper } from "@/components/repair-order/ro-phase-stepper";
import { cn } from "@/lib/utils";

export type { RoTabBadges } from "@/lib/ro-phases";

const MEMBERSHIP_TAB = {
  label: MEMBERSHIP_TAB_LABEL,
  shortLabel: MEMBERSHIP_TAB_SHORT,
  segment: "membership",
  icon: HeartHandshake,
};

function MembershipTab({
  basePath,
  pathname,
}: {
  basePath: string;
  pathname: string;
}) {
  const href = `${basePath}/${MEMBERSHIP_TAB.segment}`;
  const active = pathname === href;
  const Icon = MEMBERSHIP_TAB.icon;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(active ? "ro-tab-care-active" : "ro-tab-care-idle", "ro-tab-care-divider")}
    >
      <Icon className="ro-tab-icon size-3.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{MEMBERSHIP_TAB.label}</span>
      <span className="sm:hidden">{MEMBERSHIP_TAB.shortLabel}</span>
    </Link>
  );
}

/** RO workspace nav — phase stepper on ShopRally 3004; hidden on 3030 (shell stepper). */
export function RoTabs({
  basePath,
  showMembershipTab = false,
  badges = {},
  allowedSegments,
  embedded = false,
  trailing,
}: {
  basePath: string;
  showMembershipTab?: boolean;
  badges?: RoTabBadges;
  /** When set, only these tab segments render (server-computed from permissions). */
  allowedSegments?: readonly string[];
  embedded?: boolean;
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const apShell = isAutopilot3030Shell();

  function tabVisible(segment: string): boolean {
    if (!allowedSegments) return true;
    return allowedSegments.includes(segment);
  }

  if (apShell) {
    return null;
  }

  const membershipTrailing =
    showMembershipTab && tabVisible(MEMBERSHIP_TAB.segment) ? (
      <MembershipTab basePath={basePath} pathname={pathname} />
    ) : null;

  const combinedTrailing =
    membershipTrailing || trailing ? (
      <>
        {membershipTrailing}
        {trailing ? (
          <div className="ro-tabs-trailing flex min-w-0 shrink-0 items-center gap-2 pl-2">
            {membershipTrailing ? (
              <span className="ro-tabs-trailing-divider hidden h-5 sm:inline-block" aria-hidden />
            ) : null}
            {trailing}
          </div>
        ) : null}
      </>
    ) : undefined;

  return (
    <RoPhaseStepper
      basePath={basePath}
      badges={badges}
      allowedSegments={allowedSegments}
      embedded={embedded}
      className={cn(
        embedded ? "min-w-0 w-full" : "sticky top-0 z-10 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90",
      )}
      trailing={combinedTrailing}
    />
  );
}
