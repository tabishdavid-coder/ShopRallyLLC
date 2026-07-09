"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { apSubnavTabClass } from "@/lib/autopilot3030/nav-active";
import { cn } from "@/lib/utils";

export type ApSubnavTabItem = {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

/** Underline tab bar — RO workspace Concerns | Services | … */
export function apSubnavTabsBarClass(className?: string) {
  return cn(
    "ap-subnav-tabs flex shrink-0 gap-0 overflow-x-auto px-2 scrollbar-none",
    className,
  );
}

type ApSubnavTabsProps = {
  items: ApSubnavTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
  trailing?: ReactNode;
};

export function ApSubnavTabs({
  items,
  activeId,
  onSelect,
  ariaLabel,
  className,
  trailing,
}: ApSubnavTabsProps) {
  return (
    <div className={apSubnavTabsBarClass(className)} role="tablist" aria-label={ariaLabel}>
      {items.map(({ id, label, shortLabel, icon: Icon, disabled }) => {
        const selected = activeId === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onSelect(id)}
            className={cn(apSubnavTabClass(selected), disabled && "cursor-not-allowed opacity-45")}
          >
            {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel ?? label}</span>
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
