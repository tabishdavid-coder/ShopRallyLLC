"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addRoActivity } from "@/server/actions/ro-activity";
import { RoActivityType } from "@/generated/prisma";
import { shopAuditEventLabel } from "@/lib/shop-audit-display";
import {
  buildRoActivityFeed,
  type RoAuditFeedRow,
  type RoManualActivityRow,
} from "@/lib/ro-activity-feed";
import { fmtDateTime, timeAgo } from "@/lib/datetime";

const TYPE_LABEL: Record<RoActivityType, string> = {
  NOTE: "Note",
  PHONE_CALL: "Phone call",
  EMAIL: "Email",
  OTHER: "Other",
};

const ACTIVITY_TYPES: { value: RoActivityType; label: string }[] = [
  { value: "NOTE", label: "Note" },
  { value: "PHONE_CALL", label: "Phone call" },
  { value: "EMAIL", label: "Email" },
  { value: "OTHER", label: "Other" },
];

export function EstimateLabActivityTab({
  roId,
  activities,
  auditEvents = [],
}: {
  roId: string;
  activities: RoManualActivityRow[];
  auditEvents?: RoAuditFeedRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<RoActivityType>("NOTE");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const feed = useMemo(
    () => buildRoActivityFeed(activities, auditEvents),
    [activities, auditEvents],
  );

  function submit() {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Description is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addRoActivity({ repairOrderId: roId, type, description: trimmed });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDescription("");
      setType("NOTE");
      router.refresh();
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-brand-navy">Activity</h3>
        <p className="text-xs text-muted-foreground">
          Notes, calls, estimate changes, payments, and other audit events on this repair order
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={type}
            onValueChange={(v) => setType(v as RoActivityType)}
            disabled={pending}
          >
            <SelectTrigger className="h-8 w-[9.5rem] border-brand-light/40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (!pending) submit();
            }
          }}
          rows={3}
          disabled={pending}
          placeholder="What happened on this repair order?"
          aria-label="Activity description"
          className="mt-2 min-h-[4.5rem] resize-y border-brand-light/40 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Ctrl+Enter to save</p>
          <Button
            size="sm"
            type="button"
            disabled={pending || !description.trim()}
            className="h-8 gap-1.5 bg-brand-navy text-xs hover:bg-brand-navy/90"
            onClick={submit}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Save activity
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-brand-red">{error}</p> : null}
      </div>

      {feed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log a note above, or make estimate changes — they appear here as an audit trail.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Repair order activity timeline">
          {feed.map((item) =>
            item.kind === "manual" ? (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                    {TYPE_LABEL[item.type]}
                  </span>
                  <time
                    className="text-[11px] text-muted-foreground"
                    title={fmtDateTime(item.createdAt)}
                  >
                    {timeAgo(item.createdAt)}
                  </time>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-foreground">{item.description}</p>
              </li>
            ) : (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                    {shopAuditEventLabel(item.eventType)}
                  </span>
                  <time
                    className="text-[11px] text-muted-foreground"
                    title={fmtDateTime(item.createdAt)}
                  >
                    {timeAgo(item.createdAt)}
                  </time>
                </div>
                <p className="mt-1.5 text-foreground">{item.summary}</p>
                {item.actorEmail ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.actorEmail}</p>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
