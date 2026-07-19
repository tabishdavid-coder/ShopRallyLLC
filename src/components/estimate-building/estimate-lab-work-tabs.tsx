"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ClipboardList,
  MessageSquareWarning,
  Package,
  Paperclip,
  Wrench,
} from "lucide-react";

import { ApSubnavTabs, type ApSubnavTabItem } from "@/components/autopilot3030/shell/ap-subnav-tabs";
import { apSubnavTabClass } from "@/lib/autopilot3030/nav-active";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { usePartsTechUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

export type EstimateLabWorkTabId =
  | "concerns"
  | "services"
  | "inspections"
  | "activity"
  | "parts"
  | "attachments";

const TABS: ApSubnavTabItem[] = [
  { id: "concerns", label: "Concerns", icon: MessageSquareWarning },
  { id: "services", label: "Services", icon: Wrench },
  { id: "inspections", label: "Inspections", icon: ClipboardList },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "parts", label: "Parts Center", shortLabel: "Parts", icon: Package },
  { id: "attachments", label: "Attachments", icon: Paperclip },
];

type Props = {
  defaultTab?: EstimateLabWorkTabId;
  panels: Record<EstimateLabWorkTabId, ReactNode>;
  /** Sticky footer (totals bar) — only rendered on Services tab */
  servicesFooter?: ReactNode;
  onTabChange?: (tab: EstimateLabWorkTabId) => void;
};

export function EstimateLabWorkTabs({
  defaultTab = "services",
  panels,
  servicesFooter,
  onTabChange,
}: Props) {
  const router = useRouter();
  const partsTechOk = usePartsTechUiEnabled();
  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.id !== "parts" || partsTechOk),
    [partsTechOk],
  );
  const initial =
    defaultTab === "parts" && !partsTechOk ? "services" : defaultTab;
  const [active, setActive] = useState<EstimateLabWorkTabId>(initial);

  function selectTab(id: EstimateLabWorkTabId) {
    if (id === "parts" && !partsTechOk) return;
    setActive(id);
    onTabChange?.(id);
    if (id === "activity") {
      router.refresh();
    }
  }

  const apShell = isAutopilot3030Shell();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {apShell ? (
        <ApSubnavTabs
          items={visibleTabs}
          activeId={active}
          onSelect={(id) => selectTab(id as EstimateLabWorkTabId)}
          ariaLabel="Estimate workspace"
        />
      ) : (
        <div
          className="flex shrink-0 gap-0 overflow-x-auto border-b border-border bg-muted/20 px-2"
          role="tablist"
          aria-label="Estimate workspace"
        >
          {visibleTabs.map(({ id, label, shortLabel, icon: Icon }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(id as EstimateLabWorkTabId)}
                className={apSubnavTabClass(selected)}
              >
                {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel ?? label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {visibleTabs.map(({ id }) => {
          const tabId = id as EstimateLabWorkTabId;
          return (
            <div
              key={tabId}
              role="tabpanel"
              hidden={active !== tabId}
              aria-hidden={active !== tabId}
              className={cn(
                "min-h-0 min-w-0 flex-1 flex-col",
                active === tabId ? "flex" : "hidden",
              )}
            >
              {panels[tabId]}
            </div>
          );
        })}
        {active === "services" && servicesFooter ? servicesFooter : null}
      </div>
    </div>
  );
}
