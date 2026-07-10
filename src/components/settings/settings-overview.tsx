import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";

import { groupedSettingsSections, SETTINGS_SECTIONS } from "@/lib/settings-catalog";

/**
 * Admin / Settings landing page — a searchable index of every settings
 * section, grouped the same way as the left rail. This is what a shop owner
 * lands on from the sidebar or user menu ("Shop Settings"), with the header
 * search (⌘K) as the fast path and this grid as the browsable one.
 */
export function SettingsOverview() {
  const groups = groupedSettingsSections();

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/85 px-6 py-7 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="mt-0.5 size-8 shrink-0 text-brand-light" aria-hidden />
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Shop configuration, all in one place</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Search above or browse the {SETTINGS_SECTIONS.length} sections below — labor rates, taxes,
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
                    {section.children && section.children.length > 0 ? (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {section.children.slice(0, 4).map((child) => (
                          <span
                            key={child.id}
                            className="rounded border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {child.label}
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
