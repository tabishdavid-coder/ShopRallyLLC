"use client";

import type { ReactNode } from "react";
import {
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const SHARE_MESSAGE_MAX = 2048;

export type ShareMethod = "EMAIL" | "SMS";

type ShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Optional subtitle under the title (e.g. RO #). */
  description?: string;
  /** Full-width notice above the two columns (email config, Stripe, etc.). */
  banner?: ReactNode;
  left: ReactNode;
  right: ReactNode;
  footerLeft?: ReactNode;
  onSend: () => void;
  sendDisabled?: boolean;
  pending?: boolean;
  sendLabel?: string;
  cancelLabel?: string;
  error?: string | null;
  success?: string | null;
};

/**
 * Wide customer share shell (ShopRally brand).
 * Desktop: left compose (recipient → subject → message) | right delivery.
 * Narrow: stacked.
 */
export function CustomerShareDialogShell({
  open,
  onOpenChange,
  title,
  description,
  banner,
  left,
  right,
  footerLeft,
  onSend,
  sendDisabled,
  pending,
  sendLabel = "Send",
  cancelLabel = "Close",
  error,
  success,
}: ShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,52rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-4xl lg:max-w-5xl",
        )}
      >
        <DialogHeader className="min-w-0 shrink-0 border-b border-brand-navy/10 px-5 py-3.5 pr-12 sm:px-6">
          <DialogTitle className="flex min-w-0 items-center gap-2.5 text-base font-semibold tracking-tight text-brand-navy sm:text-lg">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-navy text-white">
              <Send className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 truncate">{title}</span>
          </DialogTitle>
          {description ? (
            <p className="mt-1 pl-[2.375rem] text-sm text-muted-foreground">{description}</p>
          ) : null}
        </DialogHeader>

        {banner ? (
          <div className="shrink-0 space-y-2 border-b border-border/70 px-5 py-2.5 sm:px-6">{banner}</div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-w-0 lg:grid-cols-2 lg:divide-x lg:divide-border/70">
            <div className="flex min-w-0 flex-col gap-5 px-5 py-5 sm:px-6">{left}</div>
            <div className="flex min-w-0 flex-col gap-4 border-t border-border/70 bg-muted/15 px-5 py-5 sm:px-6 lg:border-t-0">
              {right}
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className="shrink-0 space-y-1 border-t px-5 py-2.5 sm:px-6">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          </div>
        )}

        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-3 border-t border-brand-navy/10 bg-background px-5 py-3 sm:px-6">
          {footerLeft ? <div className="flex min-w-0 flex-wrap items-center gap-3">{footerLeft}</div> : null}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-w-[5.5rem]"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              className="min-w-[5.5rem] gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
              onClick={onSend}
              disabled={sendDisabled || pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
              {sendLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Prominent recipient identity — person icon + name (left column, AutoLeap-style).
 */
export function ShareRecipientHeader({
  name,
  label = "Recipient",
}: {
  name: string;
  label?: string;
}) {
  const display = name.trim() || "Customer";

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy"
        aria-hidden
      >
        <UserRound className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-lg font-semibold tracking-tight text-foreground">{display}</p>
      </div>
    </div>
  );
}

export function ShareSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Top-of-right-rail Email | SMS channel switch (active = navy fill).
 */
export function ShareChannelSwitch({
  method,
  onChange,
  smsEnabled,
  name = "share-channel",
}: {
  method: ShareMethod;
  onChange: (m: ShareMethod) => void;
  smsEnabled: boolean;
  name?: string;
}) {
  const options: { value: ShareMethod; label: string; icon: typeof Mail; disabled?: boolean }[] = [
    { value: "EMAIL", label: "Email", icon: Mail },
    { value: "SMS", label: "SMS", icon: MessageSquare, disabled: !smsEnabled },
  ];

  return (
    <div className="space-y-2">
      <ShareSectionLabel>Send via</ShareSectionLabel>
      <div
        className={cn(
          "grid gap-1 rounded-lg border border-brand-navy/15 bg-background p-1",
          smsEnabled ? "grid-cols-2" : "grid-cols-1",
        )}
        role="radiogroup"
        aria-label="Send via"
      >
        {options
          .filter((o) => o.value === "EMAIL" || smsEnabled)
          .map((o) => {
            const Icon = o.icon;
            const active = method === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                onClick={() => onChange(o.value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-navy text-white shadow-sm"
                    : "text-foreground/80 hover:bg-brand-light/20 hover:text-brand-navy",
                  o.disabled && "cursor-not-allowed opacity-40",
                )}
                aria-pressed={active}
              >
                <Icon className="size-3.5" aria-hidden />
                {o.label}
                <input
                  type="radio"
                  name={name}
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange(o.value)}
                  tabIndex={-1}
                />
              </button>
            );
          })}
      </div>
    </div>
  );
}

/** @deprecated Use ShareChannelSwitch */
export const ShareDeliveryMethodPicker = ShareChannelSwitch;

/**
 * Destination summary for the active channel — sits directly under the channel switch.
 * Pass `children` for edit controls (other email/phone, radio list).
 */
export function ShareWhereGoingPanel({
  method,
  email,
  phone,
  children,
}: {
  method: ShareMethod;
  /** Resolved display email for EMAIL channel (null/empty → No email). */
  email?: string | null;
  /** Resolved display phone for SMS channel (null/empty → No phone). */
  phone?: string | null;
  children?: ReactNode;
}) {
  const isEmail = method === "EMAIL";
  const value = (isEmail ? email : phone)?.trim() || "";
  const empty = !value;

  return (
    <div className="space-y-2">
      <ShareSectionLabel>Where it&apos;s going</ShareSectionLabel>
      <div className="rounded-lg border border-brand-navy/15 bg-background p-3">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
              empty ? "bg-muted text-muted-foreground" : "bg-brand-navy/10 text-brand-navy",
            )}
          >
            {isEmail ? (
              <Mail className="size-3.5" aria-hidden />
            ) : (
              <MessageSquare className="size-3.5" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isEmail ? "Email" : "Phone"}
            </p>
            {empty ? (
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                {isEmail ? "No email" : "No phone"}
              </p>
            ) : (
              <p className="mt-0.5 break-all text-sm font-semibold text-foreground">{value}</p>
            )}
          </div>
        </div>
        {children ? <div className="mt-3 border-t border-border/70 pt-3">{children}</div> : null}
      </div>
    </div>
  );
}

/** Opens the real customer-facing public page in a new tab. */
export function ShareCustomerPreviewButton({
  link,
  linkLoading,
  disabled,
  label = "Customer Preview",
}: {
  link: string | null;
  linkLoading?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 gap-1.5 px-2.5 font-semibold text-brand-navy hover:bg-brand-light/25 hover:text-brand-navy"
      disabled={disabled || linkLoading || !link}
      onClick={() => {
        if (!link) return;
        window.open(link, "_blank", "noopener,noreferrer");
      }}
    >
      {linkLoading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <ExternalLink className="size-3.5" aria-hidden />
      )}
      {label}
    </Button>
  );
}

/**
 * Demoted copy-link control — only visible once the link is ready.
 * Prefer Customer Preview in the footer; this is a quiet secondary action.
 */
export function ShareCopyLinkQuiet({
  link,
  linkLoading,
  linkError,
  copied,
  onCopy,
  copyLabel = "Copy link",
}: {
  link: string | null;
  linkLoading?: boolean;
  linkError?: string | null;
  copied: boolean;
  onCopy: () => void;
  copyLabel?: string;
}) {
  if (linkError && !link) {
    return <p className="text-xs text-destructive">{linkError}</p>;
  }

  if (linkLoading || !link) return null;

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-brand-navy"
    >
      {copied ? (
        <Check className="size-3 text-emerald-600" aria-hidden />
      ) : (
        <Link2 className="size-3" aria-hidden />
      )}
      {copied ? "Copied" : copyLabel}
    </button>
  );
}

/** @deprecated Prefer ShareCopyLinkQuiet + ShareCustomerPreviewButton */
export function ShareCopyLinkCard({
  link,
  linkLoading,
  linkError,
  copied,
  onCopy,
  label = "Customer link",
  copyLabel = "Copy link",
}: {
  link: string | null;
  linkLoading?: boolean;
  linkError?: string | null;
  copied: boolean;
  onCopy: () => void;
  label?: string;
  copyLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <ShareSectionLabel>{label}</ShareSectionLabel>
      <div className="rounded-lg border border-brand-navy/15 bg-background p-3">
        <ShareCopyLinkQuiet
          link={link}
          linkLoading={linkLoading}
          linkError={linkError}
          copied={copied}
          onCopy={onCopy}
          copyLabel={copyLabel}
        />
      </div>
    </div>
  );
}

/** Legacy amber banner — prefer empty state inside ShareWhereGoingPanel. */
export function ShareContactStatus({
  method,
  hasEmail,
  hasPhone,
}: {
  method: ShareMethod;
  hasEmail: boolean;
  hasPhone: boolean;
}) {
  if (method === "EMAIL" && hasEmail) return null;
  if (method === "SMS" && hasPhone) return null;

  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
      {method === "EMAIL"
        ? "No email on file — enter an address below or choose Other."
        : "No phone on file — enter a number below or choose Other."}
    </div>
  );
}

/**
 * Lean attachments summary — one line for the customer page link.
 */
export function ShareAttachmentsPanel({
  includedLabel,
  includedHint,
}: {
  includedLabel: string;
  /** Optional short hint; omit for a single-line lean row. */
  includedHint?: string;
}) {
  return (
    <div className="space-y-2">
      <ShareSectionLabel>Attachments</ShareSectionLabel>
      <div className="flex items-start gap-2.5 rounded-lg border border-brand-navy/12 bg-background px-3 py-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy">
          <Link2 className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{includedLabel}</p>
          {includedHint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{includedHint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer quieter inline notes or omit — do not use large info boxes. */
export function ShareLinkMetaNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}

export function ShareFieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

export function shareTextareaClassName() {
  return "box-border block min-h-[180px] w-full min-w-0 resize-y break-words rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/20";
}

export function shareInputClassName() {
  return "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/20";
}
