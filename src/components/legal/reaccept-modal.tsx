"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AgreementType } from "@/generated/prisma";
import { acceptRequiredAgreementsReaccept } from "@/server/actions/legal";

type OutdatedDoc = {
  type: AgreementType;
  label: string;
  version: string;
  href: string;
};

export function ReacceptModal({ outdatedDocs }: { outdatedDocs: OutdatedDoc[] }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await acceptRequiredAgreementsReaccept({ acceptedAgreements: accepted });
      if (!res.ok) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reaccept-title"
        className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-brand-red" />
          <div>
            <h2 id="reaccept-title" className="text-lg font-semibold text-brand-navy">
              Updated agreements require your acceptance
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ShopRally has published new versions of platform agreements. Review the changes
              below and accept to continue using the app.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
          {outdatedDocs.map((doc) => (
            <li key={doc.type} className="flex items-center justify-between gap-2">
              <span className="font-medium">{doc.label}</span>
              <span className="text-xs text-muted-foreground">v{doc.version}</span>
              <Link
                href={doc.href}
                target="_blank"
                className="ml-auto text-xs font-medium text-brand-navy hover:underline"
              >
                Review
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            id="reaccept-checkbox"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <Label htmlFor="reaccept-checkbox" className="cursor-pointer text-sm leading-relaxed">
            I have read and agree to the updated agreement{outdatedDocs.length > 1 ? "s" : ""}{" "}
            listed above on behalf of my shop.
          </Label>
        </div>

        {error ? (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          className="mt-4 w-full bg-brand-navy hover:bg-brand-navy/90"
          disabled={!accepted || pending}
          onClick={submit}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Accept &amp; continue
        </Button>
      </div>
    </div>
  );
}
