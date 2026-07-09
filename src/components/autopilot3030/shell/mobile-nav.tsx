"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AP_HOME_HREF, AP_NAV_SECTIONS, apSectionIsActive } from "@/lib/autopilot3030/nav";
import { apMobileNavClass } from "@/lib/autopilot3030/nav-active";
import { cn } from "@/lib/utils";

export function ApMobileNav({ allowedSectionIds }: { allowedSectionIds?: string[] }) {
  const pathname = usePathname();
  const allowed = allowedSectionIds ? new Set(allowedSectionIds) : null;
  const sections = AP_NAV_SECTIONS.filter((s) => !allowed || allowed.has(s.id)).slice(0, 5);

  return (
    <nav
      className="ap-mobile-nav-bar flex shrink-0 px-1 py-1 md:hidden"
      aria-label="Mobile navigation"
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const active = apSectionIsActive(pathname, section);
        const href =
          section.href ??
          section.items.find((i) => !i.stub)?.href ??
          AP_HOME_HREF;

        return (
          <Link
            key={section.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={apMobileNavClass(active)}
          >
            <Icon className={cn("size-5", active && "ap-text-accent")} aria-hidden />
            <span className="truncate px-0.5">{section.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
