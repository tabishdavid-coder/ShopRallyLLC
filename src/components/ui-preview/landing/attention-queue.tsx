"use client";

import Link from "next/link";
import {
  AlertCircle,
  ChevronRight,
  DollarSign,
  MessageSquare,
} from "lucide-react";

import type { AttentionItem } from "@/components/ui-preview/landing/attention-items";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  approval: AlertCircle,
  balance: DollarSign,
  messages: MessageSquare,
} as const;

export function AttentionQueue({ items }: { items: AttentionItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-brand-red/25 bg-brand-red/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-brand-red">Needs attention</h3>
        <span className="rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-bold text-white">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing urgent — you&apos;re caught up for now.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-start gap-2 rounded-lg border border-transparent bg-card px-3 py-2",
                    "transition-colors hover:border-brand-light hover:bg-brand-light/10",
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-brand-red" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
