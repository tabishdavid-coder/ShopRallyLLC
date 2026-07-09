import { UserCircle } from "lucide-react";

import type { ServiceAdvisorInfo } from "@/lib/service-advisor";
import { serviceAdvisorLabel } from "@/lib/service-advisor";

export function ServiceAdvisorCard({
  advisor,
  compact,
  className,
}: {
  advisor: ServiceAdvisorInfo;
  compact?: boolean;
  className?: string;
}) {
  const hasAdvisor = advisor.name || advisor.email || advisor.phone;
  if (!hasAdvisor) return null;

  if (compact) {
    return (
      <p className={`text-sm text-muted-foreground ${className ?? ""}`}>
        <span className="font-medium text-foreground">Service advisor:</span>{" "}
        {serviceAdvisorLabel(advisor)}
        {advisor.phone ? (
          <span className="text-muted-foreground"> · {advisor.phone}</span>
        ) : null}
      </p>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm ${className ?? ""}`}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
        <UserCircle className="size-5" />
      </div>
      <div className="min-w-0 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Service advisor
        </p>
        <p className="font-semibold text-foreground">{serviceAdvisorLabel(advisor)}</p>
        {advisor.email ? (
          <p className="truncate text-muted-foreground">{advisor.email}</p>
        ) : null}
        {advisor.phone ? (
          <p className="text-muted-foreground">{advisor.phone}</p>
        ) : null}
      </div>
    </div>
  );
}
