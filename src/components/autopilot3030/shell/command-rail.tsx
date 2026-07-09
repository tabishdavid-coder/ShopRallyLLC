"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AP_HOME_HREF,
  AP_NAV_SECTIONS,
  apSectionIsActive,
  type ApNavSection,
} from "@/lib/autopilot3030/nav";
import { apRailItemClass } from "@/lib/autopilot3030/nav-active";
import { cn } from "@/lib/utils";

function filterSections(
  sections: ApNavSection[],
  allowedSectionIds?: string[],
): ApNavSection[] {
  if (!allowedSectionIds) return sections;
  const allowed = new Set(allowedSectionIds);
  return sections.filter((s) => allowed.has(s.id));
}

export function ApCommandRail({
  allowedSectionIds,
}: {
  allowedSectionIds?: string[];
}) {
  const pathname = usePathname();
  const sections = filterSections(AP_NAV_SECTIONS, allowedSectionIds);

  return (
    <nav
      className="ap-command-rail hidden shrink-0 flex-col items-center gap-1.5 overflow-y-auto overscroll-contain py-3 md:flex"
      aria-label="Primary sections"
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const active = apSectionIsActive(pathname, section);
        const href =
          section.href ??
          section.items.find((i) => !i.stub && !i.disabled)?.href ??
          AP_HOME_HREF;

        return (
          <Link
            key={section.id}
            href={href}
            title={section.label}
            aria-current={active ? "page" : undefined}
            className={cn(apRailItemClass(active), "group")}
          >
            <Icon className="size-[1.125rem]" aria-hidden />
            <span className="sr-only">{section.label}</span>
            {active ? (
              <span
                className="ap-rail-active-indicator absolute -right-px top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
