"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";

export const COMMUNICATIONS_NAV_TABS = [
  { label: "Phone & SMS", href: "/settings/communications/phone-sms" },
  { label: "Email", href: "/settings/communications/email" },
  { label: "Notifications", href: "/settings/communications/notifications" },
] as const;

export function communicationsTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CommunicationsTabs() {
  const pathname = usePathname();

  return (
    <nav className={subnavBarClass()} aria-label="Communications settings">
      {COMMUNICATIONS_NAV_TABS.map((tab) => {
        const active = communicationsTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={subnavTabClass(active, "py-2")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
