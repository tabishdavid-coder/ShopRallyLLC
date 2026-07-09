"use client";

import type { AutomationSendHistoryRow } from "@/server/automations";
import { fmtDateTime } from "@/lib/datetime";

export function AutomationSendHistoryTable({ rows }: { rows: AutomationSendHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No automation sends yet. Enable an automation and complete a repair order or book an
        appointment to see history here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3">Automation</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">{r.automationName}</td>
              <td className="px-4 py-3">{r.customerName}</td>
              <td className="px-4 py-3">{r.channel}</td>
              <td className="px-4 py-3">{r.status}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.sentAt ? fmtDateTime(r.sentAt) : r.error ?? (r.scheduledFor ? `Scheduled ${fmtDateTime(r.scheduledFor)}` : "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
