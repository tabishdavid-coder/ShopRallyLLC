"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeft, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SETTINGS_SECTIONS,
  settingsSectionIsActive,
} from "@/lib/settings-catalog";
import { SettingsIndexNav } from "@/components/settings/settings-index-nav";
import { SettingsSearch } from "@/components/settings/settings-search";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Unified Admin / Settings shell: a page header (title + subtitle + search)
 * over a two-pane body (grouped left index rail + content). Replaces the old
 * crowded horizontal tab strip. Sections that manage their own sub-pages keep
 * their in-content sub-rail (SettingsSubnav) inside `children`.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  const activeSection = SETTINGS_SECTIONS.find((s) =>
    settingsSectionIsActive(pathname, s),
  );

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-navy text-brand-navy-foreground shadow-sm">
                <SlidersHorizontal className="size-4.5" aria-hidden />
              </span>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>Admin</span>
                  <ChevronRight className="size-3" aria-hidden />
                  <span className="text-foreground">{activeSection ? activeSection.label : "Overview"}</span>
                </div>
                <h1 className="font-heading text-xl font-semibold leading-tight text-foreground">
                  Settings
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: open the section index in a drawer. */}
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetTrigger
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted/70 md:hidden",
                )}
              >
                <PanelLeft className="size-4" aria-hidden />
                Sections
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b">
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div
                  className="overflow-y-auto p-4"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a")) setMobileNav(false);
                  }}
                >
                  <SettingsIndexNav />
                </div>
              </SheetContent>
            </Sheet>
            <SettingsSearch />
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-4 rounded-xl border bg-card p-3 shadow-sm">
            <SettingsIndexNav />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
