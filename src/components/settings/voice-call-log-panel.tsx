"use client";

import Link from "next/link";
import { ExternalLink, PhoneCall } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { VoiceCallLogRow } from "@/server/voice-call-log";

const STATUS_LABEL: Record<string, string> = {
  ringing: "Ringing",
  agent: "AI agent",
  forwarded: "Forwarded",
  completed: "Completed",
  failed: "Failed",
};

export function VoiceCallLogPanel({ calls }: { calls: VoiceCallLogRow[] }) {
  if (calls.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <PhoneCall className="size-4 text-brand-navy" />
          Call log
        </div>
        <p className="mt-2">No inbound voice calls yet. Calls appear here after your Twilio number receives them.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <PhoneCall className="size-4 text-brand-navy" />
        <h3 className="font-medium">Recent voice calls</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">When</th>
              <th className="pb-2 pr-3 font-medium">From</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">Duration</th>
              <th className="pb-2 font-medium">Recording</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3 align-top text-xs text-muted-foreground">
                  {new Date(call.createdAt).toLocaleString()}
                </td>
                <td className="py-2 pr-3 align-top font-mono text-xs">{call.fromPhone}</td>
                <td className="py-2 pr-3 align-top">
                  <Badge variant="secondary" className="text-xs">
                    {STATUS_LABEL[call.status] ?? call.status}
                  </Badge>
                  {call.consentGiven ? (
                    <span className="mt-1 block text-[10px] text-muted-foreground">Recording consent</span>
                  ) : null}
                </td>
                <td className="py-2 pr-3 align-top text-xs">
                  {call.durationSeconds != null ? `${call.durationSeconds}s` : "—"}
                </td>
                <td className="py-2 align-top text-xs">
                  {call.recordingUrl ? (
                    <a
                      href={call.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-navy hover:underline"
                    >
                      Listen
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                  {call.appointmentId ? (
                    <Link
                      href="/appointments"
                      className="mt-1 block text-[10px] text-emerald-700 hover:underline"
                    >
                      Appointment booked
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
