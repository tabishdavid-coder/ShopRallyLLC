"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CircleDashed, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { testVendorConnection } from "@/server/actions/vendor-integrations";

export function CarMdSetupPanel({ envVars }: { envVars: string[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function test() {
    setMessage(null);
    setError(null);
    start(async () => {
      const res = await testVendorConnection("carmd");
      if (res.ok) setMessage(res.message ?? "OK");
      else setError(res.error);
    });
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <p className="flex items-start gap-2 font-medium">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          CarMD Vehicle API host unreachable (checked 2026-07-22)
        </p>
        <p className="mt-1 pl-6 text-amber-900/90">
          <code className="rounded bg-amber-100/80 px-1 text-xs">api.carmd.com</code> (portal, docs, and v3.0 API)
          times out — no public signup today. CarMD.com is still live; contact them for B2B API access. Mock DTC
          lookup works without keys.
        </p>
      </div>

      <div>
        <h3 className="font-medium">Platform credentials</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          CarMD uses two headers on every request:{" "}
          <code className="rounded bg-muted px-1 text-xs">authorization</code> (include the{" "}
          <code className="rounded bg-muted px-1 text-xs">Basic </code> prefix) and{" "}
          <code className="rounded bg-muted px-1 text-xs">partner-token</code>. When the API host is back, keys come
          from the member portal at{" "}
          <span className="font-medium text-foreground">api.carmd.com/member</span> (currently down). Until then, request
          access via{" "}
          <a
            href="https://carmd.com/pages/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-navy hover:underline"
          >
            CarMD contact
            <ExternalLink className="ml-0.5 inline size-3.5" />
          </a>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {envVars.map((e) => (
          <code key={e} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {e}
          </code>
        ))}
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">DTC lookup</span> — estimate Concerns tab → DTC lookup
          (on-demand only).
        </li>
        <li>
          <span className="font-medium text-foreground">Maintenance</span> — server action{" "}
          <code className="text-xs">getCarMdMaintenance</code> wired; UI hook TBD.
        </li>
        <li>Does not replace free NHTSA VIN decode — supplements diagnostics and repair hints.</li>
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {message && !error ? (
          <span className="mr-auto max-w-md text-xs text-muted-foreground">{message}</span>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={test} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CircleDashed className="size-4" />}
          Test connection
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Try mock mode without keys on any open RO →{" "}
        <Link href="/job-board" className="font-medium text-brand-navy hover:underline">
          Job board
        </Link>{" "}
        → estimate → Concerns → DTC lookup (sample P0420 / P0300).
      </p>
    </section>
  );
}
