"use client";

import type { ReactNode } from "react";
import { Info, Truck, User } from "lucide-react";

import type { CustomerFormType } from "@/components/customers/customer-form-shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Shared field chrome — matches Create New Customer intake. */
export const CUSTOMER_INTAKE_FIELD =
  "h-10 rounded-md border-[#d0d5dd] bg-white pl-9 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:border-brand-orange/50 focus-visible:ring-brand-orange/20";

export function CustomerIntakeFormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-brand-orange" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function CustomerIntakeFieldLabel({
  label,
  required,
  optional,
  info,
  className,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  info?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-1.5 flex items-center gap-1", className)}>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        {optional ? (
          <span className="font-normal text-muted-foreground/80"> (Optional)</span>
        ) : null}
      </label>
      {info ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex text-muted-foreground/70 hover:text-muted-foreground"
              aria-label={`${label} info`}
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left">
            {info}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function CustomerIntakeIconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
      <Input className={cn(CUSTOMER_INTAKE_FIELD, className)} {...props} />
    </div>
  );
}

export function CustomerIntakeIconSelect({
  icon: Icon,
  value,
  onValueChange,
  placeholder,
  disabled,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground/60" />
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn(CUSTOMER_INTAKE_FIELD, "w-full")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

export function CustomerIntakeTypeTabs({
  type,
  onChange,
  disabled,
}: {
  type: CustomerFormType;
  onChange: (type: CustomerFormType) => void;
  disabled?: boolean;
}) {
  const tabs: {
    id: CustomerFormType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "person", label: "Regular Customer", icon: User },
    { id: "business", label: "Commercial Account", icon: Truck },
  ];

  return (
    <div className="flex gap-8 border-b border-[#eaecf0]">
      {tabs.map((tab) => {
        const active = type === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors disabled:opacity-60",
              active
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
