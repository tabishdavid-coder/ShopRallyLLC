"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  FEATURES_MENU_COLUMNS,
  FEATURES_MENU_SEE_ALL,
  type FeaturesMenuItem,
} from "@/lib/marketing-features-menu";
import { cn } from "@/lib/utils";

type FeaturesMegaMenuProps = {
  /** Highlight Features trigger when on /features */
  active?: boolean;
};

function FeatureRow({
  item,
  onNavigate,
}: {
  item: FeaturesMenuItem;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[14px] transition-colors",
        item.soon
          ? "text-slate-400 hover:bg-slate-50 hover:text-slate-500"
          : "text-slate-700 hover:bg-brand-light/25 hover:text-brand-navy",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          item.soon
            ? "text-slate-300 group-hover:text-slate-400"
            : "text-brand-navy/80 group-hover:text-brand-navy",
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
      {item.badge === "AI" ? (
        <span className="shrink-0 rounded bg-brand-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          AI
        </span>
      ) : null}
      {item.soon ? (
        <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Soon
        </span>
      ) : null}
    </Link>
  );
}

function ColumnHeader({ title }: { title: string }) {
  return (
    <div className="mb-2 border-b border-brand-navy/10 pb-2">
      <p
        className={cn(
          "border-l-2 border-brand-light pl-2",
          "text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-brand-navy",
          "whitespace-nowrap",
        )}
      >
        {title}
      </p>
    </div>
  );
}

function SeeAllFeaturesLink({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Link
      href={FEATURES_MENU_SEE_ALL.href}
      scroll
      onClick={(e) => {
        onNavigate?.();
        // Hard guarantee navigation even if the mega panel unmounts mid-click.
        e.preventDefault();
        router.push(FEATURES_MENU_SEE_ALL.href);
      }}
      className={cn(
        "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-navy/20 bg-white px-3 py-2.5 text-sm font-semibold text-brand-navy shadow-sm transition-colors hover:border-brand-navy/35 hover:bg-brand-light/20",
        className,
      )}
    >
      {FEATURES_MENU_SEE_ALL.label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

/** Desktop Features trigger + full-width mega panel (4 columns). */
export function FeaturesMegaMenu({ active }: FeaturesMegaMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeMenu();
    };
    const onDocKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        (
          rootRef.current?.querySelector(
            "[data-features-trigger]",
          ) as HTMLButtonElement | null
        )?.focus();
      }
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open, closeMenu]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  };

  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      (
        rootRef.current?.querySelector(
          "[data-features-trigger]",
        ) as HTMLButtonElement | null
      )?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        data-features-trigger
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          open || active
            ? "bg-brand-navy/10 text-brand-navy"
            : "text-slate-600 hover:bg-brand-light/20 hover:text-brand-navy",
        )}
      >
        Features
        <ChevronDown
          className={cn(
            "size-3.5 opacity-70 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-label="ShopRally features"
        hidden={!open}
        onKeyDown={onPanelKeyDown}
        className={cn(
          "absolute left-1/2 top-full z-50 w-[min(92vw,56rem)] -translate-x-1/2 pt-3",
          !open && "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "origin-top rounded-2xl border border-brand-navy/10 bg-white shadow-[0_18px_50px_-12px_rgba(22,88,142,0.22)] ring-1 ring-brand-navy/5 transition-[opacity,transform] duration-150",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0",
          )}
        >
          {/* Brand accent — navy→light-blue, not competitor teal */}
          <div
            className="h-1 rounded-t-2xl bg-gradient-to-r from-brand-navy via-brand-light to-brand-navy/80"
            aria-hidden
          />
          {/* Equal 4-col grid: shared column padding + dividers (no gap+pl stack). */}
          <div className="grid grid-cols-4 px-3 pb-3.5 pt-4 sm:px-4">
            {FEATURES_MENU_COLUMNS.map((col, index) => (
              <div
                key={col.id}
                className={cn(
                  "min-w-0 px-3",
                  index > 0 && "border-l border-brand-navy/10",
                )}
              >
                <ColumnHeader title={col.title} />
                <ul className="space-y-0.5">
                  {col.items.map((item) => (
                    <li key={`${col.id}-${item.label}`}>
                      <FeatureRow item={item} onNavigate={closeMenu} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-brand-navy/10 px-6 py-3 sm:px-7">
            <SeeAllFeaturesLink onNavigate={closeMenu} className="sm:max-w-xs sm:ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mobile accordion block inside the existing slide-down menu. */
export function FeaturesMobileAccordion({ onNavigate }: { onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-lg">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-light/20"
      >
        Features
        <ChevronDown
          className={cn(
            "size-4 text-slate-500 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div id={panelId} hidden={!expanded} className="pb-2 pl-1">
        {FEATURES_MENU_COLUMNS.map((col) => (
          <div key={col.id} className="mt-3.5 px-2 first:mt-1">
            <ColumnHeader title={col.title} />
            <ul className="space-y-0.5">
              {col.items.map((item) => (
                <li key={`m-${col.id}-${item.label}`}>
                  <FeatureRow item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="mt-3.5 px-2">
          <SeeAllFeaturesLink onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}
