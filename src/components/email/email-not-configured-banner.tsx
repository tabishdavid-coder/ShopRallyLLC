"use client";

import Link from "next/link";
import { AlertTriangle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  onMailtoFallback?: () => void;
  showMailtoButton?: boolean;
};

export function EmailNotConfiguredBanner({ onMailtoFallback, showMailtoButton }: Props) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-2">
        <p>
          Shop email is not configured. Configure a from address in{" "}
          <Link href="/settings/communications/email" className="font-medium text-brand-navy hover:underline">
            Settings → Email
          </Link>{" "}
          to send directly from CRM, or use your mail app as a fallback.
        </p>
        {showMailtoButton && onMailtoFallback ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-amber-300 bg-white hover:bg-amber-50"
            onClick={onMailtoFallback}
          >
            <Mail className="size-3.5" />
            Open in email app
          </Button>
        ) : null}
      </div>
    </div>
  );
}
