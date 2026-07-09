"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { subnavTabClass } from "@/lib/subnav-styles";
import { cn } from "@/lib/utils";

/** All shop settings sections — single scroll row on every /settings page. */
export const SETTINGS_NAV_TABS = [
  { label: "Shop Profile", href: "/settings" },
  { label: "RO Settings", href: "/settings/ro-settings" },
  { label: "Appointments", href: "/settings/appointments" },
  { label: "Markups", href: "/settings/markups" },
  { label: "Lead Sources", href: "/settings/marketing" },
  { label: "Customers", href: "/settings/customers" },
  { label: "Commissions", href: "/settings/commissions" },
  { label: "Integrations", href: "/settings/integrations" },
  { label: "Communications", href: "/settings/communications" },
  { label: "Legal", href: "/settings/legal" },
  { label: "QuickBooks", href: "/settings/quickbooks" },
  { label: "Subscription", href: "/settings/subscription" },
] as const;

export function settingsTabActive(pathname: string, href: string): boolean {
  if (href === "/settings") return pathname === "/settings";
  if (href === "/settings/subscription") {
    return (
      pathname === "/settings/subscription" ||
      pathname === "/settings/billing" ||
      pathname === "/billing"
    );
  }
  if (href === "/settings/ro-settings") {
    return (
      pathname.startsWith("/settings/ro-settings") ||
      pathname === "/settings/estimates" ||
      pathname.startsWith("/settings/estimates/")
    );
  }
  if (href === "/settings/markups") {
    return pathname.startsWith("/settings/markups");
  }
  if (href === "/settings/communications") {
    return (
      pathname.startsWith("/settings/communications") ||
      pathname === "/settings/messaging" ||
      pathname === "/settings/email" ||
      pathname === "/settings/notifications"
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-card/50 scrollbar-none",
      )}
      aria-label="Shop settings"
    >
      {SETTINGS_NAV_TABS.map((tab) => {
        const active = settingsTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={subnavTabClass(active, "shrink-0 whitespace-nowrap py-2 text-xs sm:text-sm")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
