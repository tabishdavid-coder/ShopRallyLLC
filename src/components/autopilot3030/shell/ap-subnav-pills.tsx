"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { apNavItemIsActive, type ApNavLink } from "@/lib/autopilot3030/nav";
import { apSubnavPillClass } from "@/lib/autopilot3030/nav-active";
import { cn } from "@/lib/utils";

/** Horizontal pill-chip subnav bar (Shop Growth, SEO, Markups, …). */
export function apSubnavPillsBarClass(className?: string) {
  return cn(
    "ap-subnav-pills ap-module-subnav scrollbar-none flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2",
    className,
  );
}

export type ApSubnavPillItem = ApNavLink;

type ApSubnavPillsProps = {
  items: ApSubnavPillItem[];
  ariaLabel: string;
  pathname: string;
  /** Hide icons — used for compact mockups only. */
  compact?: boolean;
  getActive?: (pathname: string, item: ApSubnavPillItem) => boolean;
  className?: string;
};

export function ApSubnavPills({
  items,
  ariaLabel,
  pathname,
  compact = false,
  getActive,
  className,
}: ApSubnavPillsProps) {
  return (
    <nav className={apSubnavPillsBarClass(className)} aria-label={ariaLabel}>
      {items.map((item) => {
        if (item.disabled) {
          return (
            <span
              key={item.href}
              className={cn(apSubnavPillClass(false), "ap-subnav-pill--disabled")}
              title="Coming soon"
            >
              {!compact && item.icon ? (
                <item.icon className="size-3.5 shrink-0" aria-hidden />
              ) : null}
              {item.title}
            </span>
          );
        }

        const active = getActive
          ? getActive(pathname, item)
          : apNavItemIsActive(pathname, item, items);
        const Icon = item.icon;

        return (
          <Link
            key={item.href + item.title}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={apSubnavPillClass(active)}
          >
            {!compact ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
            {item.title}
            {item.stub ? (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                Soon
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Single pill chip — for mockups or one-off subnav rows. */
export function ApSubnavPill({
  href,
  title,
  icon: Icon,
  active = false,
  disabled = false,
  className,
}: {
  href?: string;
  title: string;
  icon?: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const pillClass = cn(apSubnavPillClass(active), disabled && "ap-subnav-pill--disabled", className);

  if (disabled || !href) {
    return (
      <span className={pillClass} title={disabled ? "Coming soon" : undefined}>
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
        {title}
      </span>
    );
  }

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={pillClass}>
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {title}
    </Link>
  );
}
