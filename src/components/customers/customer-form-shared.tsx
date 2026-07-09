"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type CustomerFormType = "person" | "business";

export type EditableCustomerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  marketingOptIn: boolean;
  notes: string | null;
  tags?: string[];
};

export const customerFieldInputClass =
  "border-brand-navy/15 focus-visible:ring-brand-navy/30";

type CustomerFormFields = {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
};

export function validateCustomerForm(
  type: CustomerFormType,
  form: CustomerFormFields,
): string | null {
  if (type === "person" && (!form.firstName.trim() || !form.lastName.trim())) {
    return "First and last name are required.";
  }
  if (type === "business" && !form.company.trim()) {
    return "Business name is required.";
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

export function PersonBusinessToggle({
  type,
  onChange,
  compact,
  className,
}: {
  type: CustomerFormType;
  onChange: (type: CustomerFormType) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-brand-navy/10 bg-white p-0.5 shadow-sm",
        compact && "rounded-sm",
        className,
      )}
    >
      <Button
        type="button"
        size={compact ? "xs" : "sm"}
        variant={type === "person" ? "default" : "ghost"}
        className={cn(
          compact && "h-7 px-2.5 text-xs",
          type === "person" && "bg-brand-navy text-white hover:bg-brand-navy/90",
        )}
        onClick={() => onChange("person")}
      >
        Person
      </Button>
      <Button
        type="button"
        size={compact ? "xs" : "sm"}
        variant={type === "business" ? "default" : "ghost"}
        className={cn(
          compact && "h-7 px-2.5 text-xs",
          type === "business" && "bg-brand-navy text-white hover:bg-brand-navy/90",
        )}
        onClick={() => onChange("business")}
      >
        Business
      </Button>
    </div>
  );
}

export function CustomerFormCollapsible({
  title,
  defaultOpen = false,
  compact,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-muted/30 font-medium",
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        )}
      >
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(compact ? "space-y-2 pt-2" : "space-y-3 pt-3")}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CustomerTagPicker({
  availableTags,
  selected,
  onToggle,
  compact,
}: {
  availableTags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  compact?: boolean;
}) {
  if (!availableTags.length) {
    return (
      <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
        No tags configured for this shop.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableTags.map((tag) => {
        const active = selected.includes(tag);
        return (
          <label
            key={tag}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              active ? "border-brand-navy bg-brand-navy/10 text-brand-navy" : "border-border",
            )}
          >
            <Checkbox checked={active} onCheckedChange={() => onToggle(tag)} className="size-3.5" />
            {tag}
          </label>
        );
      })}
    </div>
  );
}

export function IntakeChecklist({
  hasCustomer,
  hasVehicle,
  concernCount,
}: {
  hasCustomer: boolean;
  hasVehicle: boolean;
  concernCount: number;
}) {
  const items = [
    { label: "Customer selected", done: hasCustomer },
    { label: "Vehicle selected", done: hasVehicle },
    { label: concernCount > 0 ? `${concernCount} concern(s)` : "Add concerns (optional)", done: concernCount > 0 },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold text-brand-navy">Intake checklist</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <Check
              className={cn("size-4 shrink-0", item.done ? "text-emerald-600" : "text-muted-foreground/40")}
            />
            <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
