"use client";

import type { ReactNode } from "react";

import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CatalogListPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-0 flex-col", className)}>{children}</div>;
}

export function CatalogListHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CatalogListStats({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function CatalogListCard({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card shadow-sm">
      {children}
    </section>
  );
}

export function CatalogListToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 space-y-2.5 border-b border-border px-3 py-3 lg:px-4">{children}</div>
  );
}

export function CatalogListToolbarRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function CatalogListCount({ count, label }: { count: number; label: string }) {
  const plural = count === 1 ? label : `${label}s`;
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      {count} {plural}
    </span>
  );
}

export function CatalogListError({ message }: { message: string }) {
  return (
    <p className="mx-3 mt-3 rounded-md border border-brand-red/25 bg-brand-red/5 px-3 py-2 text-xs text-brand-red lg:mx-4">
      {message}
    </p>
  );
}

export function CatalogListBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-auto">{children}</div>;
}

export function CatalogListEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function CatalogListFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 lg:px-4">
      {children}
    </div>
  );
}

export function CatalogListTableHeadRow({ children }: { children: ReactNode }) {
  return <TableRow className="bg-muted/40 hover:bg-muted/40">{children}</TableRow>;
}

/** Shared search input classes for catalog list toolbars */
export const catalogSearchInputClass = "h-9 border-border bg-white pl-8";
export const catalogSelectTriggerClass = "h-9 bg-white";
