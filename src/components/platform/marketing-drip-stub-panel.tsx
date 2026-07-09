"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FOUNDING_WAITLIST_DRIP,
  personalizeDripBody,
  type MarketingDripEmail,
} from "@/lib/marketing-drip-templates";

function firstNameFromLead(name: string) {
  return name.trim().split(/\s+/)[0] ?? "there";
}

function DripEmailCard({
  email,
  firstName,
}: {
  email: MarketingDripEmail;
  firstName: string;
}) {
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);
  const body = personalizeDripBody(email.body, firstName);

  async function copy(kind: "subject" | "body") {
    const text = kind === "subject" ? email.subject : body;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Day {email.dayOffset}
          </p>
          <p className="mt-0.5 text-sm font-medium text-brand-navy">{email.subject}</p>
          <p className="mt-1 text-xs text-muted-foreground">{email.preview}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copy("subject")}>
            {copied === "subject" ? <Check className="size-3" /> : <Copy className="size-3" />}
            Subject
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copy("body")}>
            {copied === "body" ? <Check className="size-3" /> : <Copy className="size-3" />}
            Body
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MarketingDripStubPanel({ leadName }: { leadName: string }) {
  const firstName = firstNameFromLead(leadName);

  return (
    <div className="mb-4 rounded-lg border border-brand-light/40 bg-brand-light/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <Mail className="size-4" />
        Pre-launch email drip (manual)
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Copy into Resend or your ESP until automated sends ship. Personalized for{" "}
        <span className="font-medium text-foreground">{firstName}</span>.
      </p>
      <div className="mt-3 space-y-2">
        {FOUNDING_WAITLIST_DRIP.map((email) => (
          <DripEmailCard key={email.id} email={email} firstName={firstName} />
        ))}
      </div>
    </div>
  );
}
