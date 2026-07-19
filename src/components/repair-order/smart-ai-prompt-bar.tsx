"use client";

import { forwardRef, type KeyboardEvent } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  /**
   * composer — roomy intake surface (default for Smart AI Intake dialog).
   * toolbar — compact multi-line for estimate Job with AI expand.
   */
  variant?: "composer" | "toolbar";
};

/** Smart AI freeform prompt — roomy composer by default so advisors can paste long notes. */
export const SmartAiPromptBar = forwardRef<HTMLTextAreaElement, Props>(function SmartAiPromptBar(
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
    variant = "composer",
  },
  ref,
) {
  const trimmed = value.trim();
  const canSubmit = !disabled && !pending && trimmed.length >= minLength;
  const isComposer = variant === "composer";

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
      return;
    }
    // Ctrl/Cmd+Enter always submits; plain Enter submits only on toolbar (shorter prompts).
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || (!isComposer && !e.shiftKey))) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-none border border-brand-navy/20 bg-gradient-to-br from-brand-navy/[0.05] via-white to-brand-light/[0.08] shadow-none",
        isComposer ? "p-3 sm:p-4" : "p-1.5",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Sparkles
          className={cn(
            "pointer-events-none absolute text-brand-red",
            isComposer ? "left-3 top-3 size-4" : "left-2.5 top-2.5 size-3.5",
          )}
          aria-hidden
        />
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled || pending}
          aria-label={ariaLabel}
          rows={isComposer ? 8 : 3}
          className={cn(
            "resize-y rounded-none border-transparent bg-white/95 text-sm shadow-none",
            "placeholder:text-muted-foreground/65 focus-visible:border-brand-navy/30 focus-visible:ring-2 focus-visible:ring-brand-light/35",
            isComposer
              ? "min-h-[11rem] pl-10 pr-3 py-3 leading-relaxed sm:min-h-[13rem]"
              : "min-h-[4.5rem] pl-8 pr-2 py-2 leading-snug",
            inputClassName,
          )}
        />
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          isComposer ? "justify-between" : "justify-end",
        )}
      >
        {isComposer ? (
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">
            Paste phone, VIN, YMM, and concerns in any order.{" "}
            <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
              Ctrl
            </kbd>
            +
            <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
              Enter
            </kbd>{" "}
            to parse.
          </p>
        ) : (
          <p className="mr-auto text-[10px] text-muted-foreground">
            Ctrl+Enter to parse
          </p>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-none px-2.5 text-muted-foreground hover:bg-brand-navy/5 hover:text-brand-navy"
              onClick={onCancel}
              aria-label="Close AI input"
              disabled={pending}
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1">Cancel</span>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-9 shrink-0 gap-1.5 rounded-none bg-brand-navy px-4 text-sm font-medium text-white shadow-none hover:bg-brand-navy/90",
              isComposer && "min-w-[9.5rem]",
            )}
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
        </div>
      </div>
    </div>
  );
});
