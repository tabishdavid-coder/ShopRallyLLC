"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  cloneDashboardCustomize,
  DASHBOARD_KPI_META,
  DASHBOARD_SECTION_META,
  DEFAULT_DASHBOARD_CUSTOMIZE,
  type DashboardCustomizePrefs,
  type DashboardSectionKey,
} from "@/lib/dashboard-customize";
import type { SnapshotSummaryFilter } from "@/lib/daily-snapshot";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DashboardCustomizePrefs;
  onApply: (next: DashboardCustomizePrefs) => void;
};

export function DashboardCustomizeDialog({
  open,
  onOpenChange,
  value,
  onApply,
}: Props) {
  const [draft, setDraft] = useState(() => cloneDashboardCustomize(value));

  useEffect(() => {
    if (open) setDraft(cloneDashboardCustomize(value));
  }, [open, value]);

  function setSection(key: DashboardSectionKey, checked: boolean) {
    setDraft((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: checked },
    }));
  }

  function setKpi(key: SnapshotSummaryFilter, checked: boolean) {
    setDraft((prev) => ({
      ...prev,
      kpis: { ...prev.kpis, [key]: checked },
    }));
  }

  function handleReset() {
    setDraft(cloneDashboardCustomize(DEFAULT_DASHBOARD_CUSTOMIZE));
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleApply() {
    onApply(cloneDashboardCustomize(draft));
    onOpenChange(false);
  }

  const kpiRowOn = draft.sections.kpiRow;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-none border border-[#DDE5EF] bg-white p-0 shadow-2xl sm:max-w-md"
        showCloseButton
      >
        <DialogHeader className="gap-1 border-b border-[#DDE5EF] px-5 py-4 pr-12">
          <DialogTitle className="text-lg font-semibold tracking-tight text-[#0B1F3B]">
            Customize dashboard
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose which sections and KPI tiles appear on your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,420px)] space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              Sections
            </p>
            <ul className="space-y-1">
              {DASHBOARD_SECTION_META.map((section) => {
                const id = `dash-section-${section.key}`;
                const checked = draft.sections[section.key];
                return (
                  <li key={section.key}>
                    <label
                      htmlFor={id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-none border border-transparent px-2 py-2 transition-colors hover:bg-[#F8FAFC]",
                        checked && "bg-[#F8FAFC]",
                      )}
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(v) => setSection(section.key, v === true)}
                        className="mt-0.5 rounded-none border-[#D0D5DD] data-[state=checked]:border-brand-orange data-[state=checked]:bg-brand-orange"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[#0B1F3B]">
                          {section.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {section.description}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            className={cn(
              "space-y-2 border-t border-[#DDE5EF] pt-4",
              !kpiRowOn && "opacity-50",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                KPI tiles
              </p>
              {!kpiRowOn ? (
                <p className="text-[11px] text-muted-foreground">Enable KPI cards first</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {DASHBOARD_KPI_META.map((kpi) => {
                const id = `dash-kpi-${kpi.key}`;
                return (
                  <Label
                    key={kpi.key}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-none px-2 py-2 text-sm font-normal text-[#0B1F3B] hover:bg-[#F8FAFC]",
                      !kpiRowOn && "pointer-events-none",
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={draft.kpis[kpi.key]}
                      disabled={!kpiRowOn}
                      onCheckedChange={(v) => setKpi(kpi.key, v === true)}
                      className="rounded-none border-[#D0D5DD] data-[state=checked]:border-brand-orange data-[state=checked]:bg-brand-orange"
                    />
                    {kpi.label}
                  </Label>
                );
              })}
            </div>
          </section>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none border-t border-[#DDE5EF] bg-[#F8FAFC] px-5 py-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-none text-[#0B1F3B] hover:bg-white"
            onClick={handleReset}
          >
            Reset to default
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-[#DDE5EF]"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none bg-brand-navy text-white hover:bg-brand-navy/90"
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
