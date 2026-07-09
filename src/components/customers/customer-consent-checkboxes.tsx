"use client";

import { Info } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CONSENT_COPY, CONSENT_SHORT_LABELS } from "@/lib/data-compliance";

type ConsentCheckboxesProps = {
  transactionalSmsConsent: boolean;
  marketingOptIn: boolean;
  marketingEmailConsent: boolean;
  onTransactionalChange: (v: boolean) => void;
  onMarketingSmsChange: (v: boolean) => void;
  onMarketingEmailChange: (v: boolean) => void;
  showEmail?: boolean;
  /** Hide the "Communication" section label. */
  hideLabel?: boolean;
  /** @deprecated Use default slim layout; kept for call-site compat. */
  compact?: boolean;
  /** @deprecated Use default slim layout; kept for call-site compat. */
  horizontal?: boolean;
  /** @deprecated Use default slim layout; kept for call-site compat. */
  stackedLabel?: boolean;
};

function ConsentCheckboxItem({
  checked,
  onCheckedChange,
  shortLabel,
  fullText,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  shortLabel: string;
  fullText: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 text-sm leading-none">
      <label className="inline-flex cursor-pointer items-center gap-1.5">
        <Checkbox
          className="size-3.5 shrink-0"
          checked={checked}
          onCheckedChange={(c) => onCheckedChange(Boolean(c))}
        />
        <span className="whitespace-nowrap">{shortLabel}</span>
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={`${shortLabel} disclosure`}
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4} className="max-w-xs text-left leading-snug">
          {fullText}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function CustomerConsentCheckboxes({
  transactionalSmsConsent,
  marketingOptIn,
  marketingEmailConsent,
  onTransactionalChange,
  onMarketingSmsChange,
  onMarketingEmailChange,
  showEmail = true,
  hideLabel = false,
}: ConsentCheckboxesProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {!hideLabel ? (
          <p className="text-sm font-medium text-foreground">Communication</p>
        ) : null}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <ConsentCheckboxItem
            checked={transactionalSmsConsent}
            onCheckedChange={onTransactionalChange}
            shortLabel={CONSENT_SHORT_LABELS.transactionalSms}
            fullText={CONSENT_COPY.transactionalSms}
          />
          <ConsentCheckboxItem
            checked={marketingOptIn}
            onCheckedChange={onMarketingSmsChange}
            shortLabel={CONSENT_SHORT_LABELS.marketingSms}
            fullText={CONSENT_COPY.marketingSms}
          />
          {showEmail ? (
            <ConsentCheckboxItem
              checked={marketingEmailConsent}
              onCheckedChange={onMarketingEmailChange}
              shortLabel={CONSENT_SHORT_LABELS.marketingEmail}
              fullText={CONSENT_COPY.marketingEmail}
            />
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  );
}
