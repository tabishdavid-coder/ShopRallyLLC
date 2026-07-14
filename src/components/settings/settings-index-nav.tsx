"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  groupedSettingsSectionsForPlan,
  settingsSectionIsActive,
  type SettingsCapabilityFlags,
} from "@/lib/settings-catalog";
import { useShopCapabilities } from "@/lib/shop-capabilities";

function capsFromShop(): SettingsCapabilityFlags {
  const c = useShopCapabilities();
  return {
    sms: c.sms,
    stripePayments: c.stripePayments,
    growth: c.growth,
    maintenancePrograms: c.maintenancePrograms,
    partsTech: c.partsTech,
    shopSite: c.shopSite,
    websiteSeo: c.websiteSeo,
  };
}

/**
 * Grouped left index rail for Admin / Settings. A pinned "Overview" link back
 * to the landing grid sits above twelve sections organized into five scannable
 * groups (Shop, Repair Orders, Customers & Marketing, Communications,
 * Integrations & Billing). Active section = light-blue wash + navy left
 * accent, matching the CRM vertical-subnav language.
 */
export function SettingsIndexNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const caps = capsFromShop();
  const groups = groupedSettingsSectionsForPlan(caps);
  const onOverview = pathname === "/settings";
  const smsOn = Boolean(caps.sms);

  return (
    <nav className={cn("flex flex-col gap-5", className)} aria-label="Settings sections">
      <div>
        <Link
          href="/settings"
          aria-current={onOverview ? "page" : undefined}
          className={cn(
            "group flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors",
            onOverview
              ? "border-brand-light/50 bg-brand-light/40 font-semibold text-brand-navy shadow-[inset_3px_0_0_var(--brand-light)]"
              : "text-crm-nav hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <LayoutGrid
            className={cn(
              "size-4 shrink-0",
              onOverview ? "text-brand-navy" : "text-muted-foreground group-hover:text-foreground",
            )}
            aria-hidden
          />
          <span className="truncate">Overview</span>
        </Link>
      </div>
      {groups.map(({ group, sections }) => (
        <div key={group.id}>
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {sections.map((section) => {
              const active = settingsSectionIsActive(pathname, section);
              const Icon = section.icon;
              const smsLocked =
                section.id === "communications" &&
                !smsOn &&
                pathname.startsWith("/settings/communications/phone-sms");
              return (
                <li key={section.id}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "border-brand-light/50 bg-brand-light/40 font-semibold text-brand-navy shadow-[inset_3px_0_0_var(--brand-light)]"
                        : "text-crm-nav hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-brand-navy" : "text-muted-foreground group-hover:text-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{section.label}</span>
                    {smsLocked ? (
                      <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
