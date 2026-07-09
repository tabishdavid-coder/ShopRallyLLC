"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CrmDialogHeaderBar({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b bg-brand-navy px-5 py-4 text-white">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-white/75">{description}</p> : null}
    </div>
  );
}

export function CrmFormField({
  label,
  required,
  compact,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(compact ? "space-y-1" : "space-y-1.5", className)}>
      <label className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
