"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { platformNavTitle } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

function buildCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Master CRM", href: "/platform" }];

  if (pathname === "/platform") {
    crumbs.push({ label: "Overview" });
    return crumbs;
  }

  if (pathname.startsWith("/platform/review")) {
    crumbs.push({ label: "Release review", href: "/platform/review" });
    if (pathname.includes("batch-04")) {
      crumbs.push({ label: "Batch 4 — Platform tools" });
    }
    return crumbs;
  }

  const sectionTitle = platformNavTitle(pathname);
  if (sectionTitle && sectionTitle !== "Overview") {
    const sectionHref = pathname.match(/^(\/platform\/[^/]+)/)?.[1];
    crumbs.push({
      label: sectionTitle,
      href: sectionHref,
    });
  }

  const shopDetail = pathname.match(/^\/platform\/shops\/([^/]+)(?:\/(.+))?$/);
  if (shopDetail) {
    crumbs.push({ label: "Shop detail" });
    if (shopDetail[2] === "legal") {
      crumbs.push({ label: "Legal / MSA" });
    }
  }

  return crumbs;
}

export function PlatformBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1 text-sm", className)}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 text-white/50" /> : null}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-white/75 transition-colors hover:text-white"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={cn(isLast ? "font-semibold text-white" : "text-white/75")}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
