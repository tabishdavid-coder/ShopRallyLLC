"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SEO_AUTOPILOT_BASE, SEO_AUTOPILOT_TABS } from "@/lib/seo-autopilot-nav";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";

export function SeoAutopilotSubnav() {
  const pathname = usePathname();

  return (
    <nav className={subnavBarClass()} aria-label="SEO Autopilot sections">
      {SEO_AUTOPILOT_TABS.map((tab) => {
        const active =
          tab.id === "overview"
            ? pathname === SEO_AUTOPILOT_BASE || pathname === `${SEO_AUTOPILOT_BASE}/`
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            title={tab.description}
            className={subnavTabClass(active)}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
