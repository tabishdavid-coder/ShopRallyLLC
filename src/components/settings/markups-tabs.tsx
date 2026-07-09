"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";

const TABS = [
  { label: "Parts Matrix", href: "/settings/markups/parts" },
  { label: "Labor Matrix", href: "/settings/markups/labor" },
] as const;

export function MarkupsTabs() {
  const pathname = usePathname();

  return (
    <nav className={subnavBarClass()} aria-label="Markup settings">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
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
