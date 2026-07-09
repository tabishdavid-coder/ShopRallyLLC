"use client";

import Link from "next/link";
import {
  AlertCircle,
  ChevronRight,
  DollarSign,
  MessageSquare,
} from "lucide-react";

import type { AttentionItem } from "@/components/crm/home/attention-items";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  approval: AlertCircle,
  balance: DollarSign,
  messages: MessageSquare,
} as const;

export function AttentionQueue({
  items,
  compact = false,
}: {
  items: AttentionItem[];
  compact?: boolean;
}) {
  const visible = compact ? items.slice(0, 4) : items;
  const overflow = compact ? items.length - visible.length : 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-brand-red/25 bg-brand-red/[0.04]",
        compact ? "p-2.5" : "h-full p-4",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", compact ? "mb-1.5" : "mb-3")}>
        <h3 className={cn("font-semibold text-brand-red", compact ? "text-sm" : "text-base")}>
          Needs attention
        </h3>
        <span className="rounded-full bg-brand-red px-1.5 py-px text-[10px] font-bold text-white">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>
          All caught up.
        </p>
      ) : (
        <ul className={cn(compact ? "space-y-1" : "space-y-1.5")}>
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-md border border-transparent bg-card transition-colors hover:border-brand-light hover:bg-brand-light/10",
                    compact ? "px-2 py-1" : "items-start gap-2 px-3 py-2",
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0 text-brand-red",
                      compact ? "size-3" : "mt-0.5 size-4",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-medium text-foreground",
                        compact ? "text-[11px] leading-tight" : "text-sm",
                      )}
                    >
                      {item.title}
                    </p>
                    {!compact && item.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                  </div>
                  {!compact ? (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : null}
                </Link>
              </li>
            );
          })}
          {overflow > 0 ? (
            <li className="px-2 text-[10px] text-muted-foreground">+{overflow} more</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
