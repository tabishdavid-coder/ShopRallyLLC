"use client";

import Link from "next/link";
import { ArrowRight, Lock, SlidersHorizontal } from "lucide-react";

import {
  groupedSettingsSectionsForPlan,
  type SettingsCapabilityFlags,
} from "@/lib/settings-catalog";
import { useShopCapabilities } from "@/lib/shop-capabilities";

/**
 * Admin / Settings landing page — a searchable index of every settings
 * section, grouped the same way as the left rail. This is what a shop owner
 * lands on from the sidebar or user menu ("Shop Settings"), with the header
 * search (⌘K) as the fast path and this grid as the browsable one.
 */
export function SettingsOverview() {
  const c = useShopCapabilities();
  const caps: SettingsCapabilityFlags = {
    sms: c.sms,
    stripePayments: c.stripePayments,
    growth: c.growth,
    maintenancePrograms: c.maintenancePrograms,
    partsTech: c.partsTech,
    shopSite: c.shopSite,
    websiteSeo: c.websiteSeo,
  };
  const groups = groupedSettingsSectionsForPlan(caps);
  const sectionCount = groups.reduce((n, g) => n + g.sections.length, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/85 px-6 py-7 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="mt-0.5 size-8 shrink-0 text-brand-light" aria-hidden />
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Shop configuration, all in one place</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Search above or browse the {sectionCount} sections below — labor rates, taxes,
              communications, integrations, billing, and more.
            </p>
          </div>
        </div>
      </div>

      {groups.map(({ group, sections }) => (
        <section key={group.id}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;
              const smsChildLocked =
                section.id === "communications" &&
                !caps.sms &&
                (section.children ?? []).some((ch) => ch.requires === "sms");
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className="group flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-brand-light/60 hover:bg-brand-light/5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-light/40 bg-brand-light/15 text-brand-navy">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{section.label}</span>
                      <ArrowRight
                        className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {section.description}
                    </span>
                    {smsChildLocked ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
                        <Lock className="size-3" aria-hidden />
                        SMS on Pro+
                      </span>
                    ) : null}
                    {section.children && section.children.length > 0 ? (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {section.children.slice(0, 4).map((child) => (
                          <span
                            key={child.id}
                            className="rounded border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {child.label}
                            {child.requires === "sms" && !caps.sms ? " (Pro+)" : ""}
                          </span>
                        ))}
                        {section.children.length > 4 ? (
                          <span className="rounded border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            +{section.children.length - 4} more
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
