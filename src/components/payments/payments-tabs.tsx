"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  subnavBarClass,
  subnavHrefIsActive,
  subnavTabClass,
  subnavTabDisabledClass,
} from "@/lib/subnav-styles";

const TABS = [
  { label: "Overview", href: "/payments" },
  { label: "Account", href: "/payments/account" },
  { label: "Terminals", href: "/payments/terminals" },
  { label: "Documents", href: "/payments/documents", disabled: true },
  { label: "Disputes", href: "/payments/disputes", disabled: true },
] as const;

export function PaymentsTabs() {
  const pathname = usePathname();

  return (
    <nav className={subnavBarClass()} aria-label="Payments">
      {TABS.map((tab) => {
        if ("disabled" in tab && tab.disabled) {
          return (
            <span key={tab.href} className={subnavTabDisabledClass()} title="Coming soon">
              {tab.label}
            </span>
          );
        }
        const active = subnavHrefIsActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={subnavTabClass(active)}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
