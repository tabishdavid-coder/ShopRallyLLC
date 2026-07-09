import type { ShopAuditEventType } from "@/generated/prisma";
import { fmtDateTime, timeAgo } from "@/lib/datetime";
import { shopAuditEventLabel } from "@/lib/shop-audit-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RoAuditTrailEvent = {
  id: string;
  eventType: ShopAuditEventType;
  summary: string;
  actorEmail: string | null;
  createdAt: Date;
  metadata?: unknown;
};

type RoAuditTrailPanelProps = {
  events: RoAuditTrailEvent[];
  title?: string;
  description?: string;
  className?: string;
};

export function RoAuditTrailPanel({
  events,
  title = "Activity log",
  description,
  className,
}: RoAuditTrailPanelProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {shopAuditEventLabel(event.eventType)}
                  </span>
                  <span className="text-xs text-muted-foreground" title={fmtDateTime(event.createdAt)}>
                    {timeAgo(event.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{event.summary}</p>
                {event.actorEmail ? (
                  <p className="text-xs text-muted-foreground">{event.actorEmail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
