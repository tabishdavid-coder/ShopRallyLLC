"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AP_TOP_NAV_SECTIONS,
  apSectionForPath,
  apSectionIsActive,
  type ApNavSection,
} from "@/lib/autopilot3030/nav";
import { apTopSectionNavClass } from "@/lib/autopilot3030/nav-active";
import { cn } from "@/lib/utils";

function sectionHref(section: ApNavSection): string {
  return (
    section.href ??
    section.items.find((item) => !item.stub && !item.disabled)?.href ??
    "/dashboard"
  );
}

/** Top horizontal section tabs — Customers, Appointments, Catalog, Growth, Admin. */
export function ApTopSectionNav({
  allowedSectionIds,
  className,
}: {
  allowedSectionIds?: string[];
  className?: string;
}) {
  const pathname = usePathname();
  const activeSection = apSectionForPath(pathname);

  const sections = allowedSectionIds
    ? AP_TOP_NAV_SECTIONS.filter((s) => allowedSectionIds.includes(s.id))
    : AP_TOP_NAV_SECTIONS;

  return (
    <nav
      className={cn("ap-top-section-nav shrink-0 overflow-x-auto px-3 py-1.5 md:px-4", className)}
      aria-label="Main sections"
    >
      <div className="flex min-w-max items-center gap-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const active =
            section.id === activeSection.id && apSectionIsActive(pathname, section);
          return (
            <Link
              key={section.id}
              href={sectionHref(section)}
              aria-current={active ? "page" : undefined}
              className={apTopSectionNavClass(active)}
              title={section.description}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span>{section.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
