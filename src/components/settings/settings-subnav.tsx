"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ImageIcon,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Wrench,
} from "lucide-react";

import { subnavVerticalClass } from "@/lib/subnav-styles";
import { cn } from "@/lib/utils";

export type SettingsSubnavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** When set, renders a Link (route-based sections). Omit for in-page button sections. */
  href?: string;
};

/** Communications — Phone & SMS / Email / Notifications */
export const COMMUNICATIONS_SUBNAV: SettingsSubnavItem[] = [
  {
    id: "phone-sms",
    label: "Phone & SMS",
    icon: MessageSquare,
    href: "/settings/communications/phone-sms",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    href: "/settings/communications/email",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    href: "/settings/communications/notifications",
  },
];

/** Markups — Parts / Labor matrices */
export const MARKUPS_SUBNAV: SettingsSubnavItem[] = [
  {
    id: "parts",
    label: "Parts Matrix",
    icon: Package,
    href: "/settings/markups/parts",
  },
  {
    id: "labor",
    label: "Labor Matrix",
    icon: Wrench,
    href: "/settings/markups/labor",
  },
];

/** Shop Profile in-page sections (no href — button mode) */
export const SHOP_PROFILE_SUBNAV: SettingsSubnavItem[] = [
  { id: "address", label: "Shop Address", icon: MapPin },
  { id: "contact", label: "Phone & Email", icon: Phone },
  { id: "logo", label: "Shop Logo", icon: ImageIcon },
];

function itemIsActive(
  item: SettingsSubnavItem,
  pathname: string,
  activeId?: string,
): boolean {
  if (activeId != null) return activeId === item.id;
  if (!item.href) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type SettingsSubnavProps = {
  items: SettingsSubnavItem[];
  ariaLabel: string;
  children: React.ReactNode;
  /** Optional uppercase label above the rail + content grid. */
  heading?: string;
  /** Controlled active id for in-page (button) mode. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Wrap children in a bordered content card (RO Settings style). */
  contentCard?: boolean;
  contentClassName?: string;
  className?: string;
};

/**
 * Shared Settings left subnav + content panel. Every multi-page section
 * (Shop Profile, RO Settings, Communications, Markups) uses this rail
 * (icon + label, light-blue wash + left accent when active).
 */
export function SettingsSubnav({
  items,
  ariaLabel,
  children,
  heading,
  activeId,
  onSelect,
  contentCard = false,
  contentClassName,
  className,
}: SettingsSubnavProps) {
  const pathname = usePathname();

  return (
    <div className={cn(className)}>
      {heading ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {heading}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <nav
          className="flex h-fit flex-col gap-0.5 rounded-lg border bg-card p-2"
          aria-label={ariaLabel}
        >
          {items.map((item) => {
            const active = itemIsActive(item, pathname, activeId);
            const linkClass = subnavVerticalClass(active, "rounded-md font-medium");
            const inner = (
              <>
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </>
            );
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={linkClass}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                aria-current={active ? "page" : undefined}
                className={linkClass}
              >
                {inner}
              </button>
            );
          })}
        </nav>
        <div
          className={cn(
            "min-w-0",
            contentCard && "rounded-lg border bg-card p-5",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
