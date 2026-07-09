"use client";

import { Clock, Mail } from "lucide-react";

import type { ScheduledMessageRow } from "@/server/automations";

export function ScheduledMessagesTable({ rows }: { rows: ScheduledMessageRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No messages scheduled in the next 30 days. Enable automations with upcoming triggers to see
        scheduled sends here.
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
            <th className="px-4 py-3">Scheduled for</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">{r.automationName}</td>
              <td className="px-4 py-3">{r.customerName}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5 text-muted-foreground" />
                  {r.channel}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {new Date(r.scheduledFor).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
