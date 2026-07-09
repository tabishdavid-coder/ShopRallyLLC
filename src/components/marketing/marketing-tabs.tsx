"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { GROWTH_ENGINE, GROWTH_ENGINE_TABS } from "@/lib/growth-engine-brand";
import { subnavBarClass, subnavHrefIsActive, subnavTabClass } from "@/lib/subnav-styles";

const TABS = [
  { label: "Overview", href: "/marketing" },
  ...GROWTH_ENGINE_TABS.map((t) => ({ label: t.label, href: t.href })),
];

export function MarketingTabs() {
  const pathname = usePathname();

  return (
    <nav className={subnavBarClass()} aria-label={GROWTH_ENGINE.name}>
      {TABS.map((tab) => {
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
