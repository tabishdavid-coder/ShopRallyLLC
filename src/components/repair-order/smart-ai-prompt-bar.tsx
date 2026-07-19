"use client";

import { forwardRef, type KeyboardEvent } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  pending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  pendingLabel?: string;
  minLength?: number;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
};

/** Horizontal Smart AI freeform prompt — matches estimate toolbar search row (h-9, navy/light-blue focus). */
export const SmartAiPromptBar = forwardRef<HTMLInputElement, Props>(function SmartAiPromptBar(
  {
    value,
    onChange,
    onSubmit,
    onCancel,
    pending = false,
    disabled = false,
    placeholder = "Describe the work in plain English…",
    submitLabel = "Parse with AI",
    pendingLabel = "Parsing…",
    minLength = 8,
    className,
    inputClassName,
    "aria-label": ariaLabel = "Describe repair work for AI",
  },
  ref,
) {
  const trimmed = value.trim();
  const canSubmit = !disabled && !pending && trimmed.length >= minLength;

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) onSubmit();
      return;
    }
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-none border border-brand-navy/20 bg-gradient-to-r from-brand-navy/[0.04] via-white to-brand-light/[0.06] p-1 shadow-none",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Sparkles
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-brand-red"
          aria-hidden
        />
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled || pending}
          aria-label={ariaLabel}
          className={cn(
            "h-9 rounded-none border-transparent bg-white/90 pl-8 pr-2 text-sm shadow-none",
            "placeholder:text-muted-foreground/70 focus-visible:border-brand-navy/30 focus-visible:ring-2 focus-visible:ring-brand-light/35",
            inputClassName,
          )}
        />
      </div>

      <Button
        type="button"
        size="sm"
        className="h-9 shrink-0 gap-1.5 rounded-none bg-brand-navy px-3 text-sm font-medium text-white shadow-none hover:bg-brand-navy/90"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {pendingLabel}
          </>
        ) : (
          <>
            <Sparkles className="size-3.5 text-brand-light" aria-hidden />
            {submitLabel}
          </>
        )}
      </Button>

      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-none text-muted-foreground hover:bg-brand-navy/5 hover:text-brand-navy"
          onClick={onCancel}
          aria-label="Close AI input"
          disabled={pending}
        >
          <X className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
});
