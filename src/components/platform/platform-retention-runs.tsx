import Link from "next/link";

import { fmtDateTime } from "@/lib/datetime";
import type { PlatformRetentionRunRow } from "@/server/platform/compliance-audit";

export function PlatformRetentionRuns({ rows }: { rows: PlatformRetentionRunRow[] }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-brand-navy">Data retention runs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Nightly per-shop jobs (messages/consent purge, customer anonymization). Trigger manually
            via{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/cron/data-retention</code>
            .
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No retention runs recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Shop</th>
                <th className="px-3 py-2 text-right">Messages</th>
                <th className="px-3 py-2 text-right">Consent</th>
                <th className="px-3 py-2 text-right">Anonymized</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(row.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/platform/shops/${row.shopId}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {row.shopName}
                    </Link>
                    {row.shopMasterId ? (
                      <p className="text-xs text-muted-foreground">{row.shopMasterId}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.messagesPurged ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.consentRecordsPurged ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.customersAnonymized ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
