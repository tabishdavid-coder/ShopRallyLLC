import type { StripeConnectStatus } from "@/generated/prisma";
import { STRIPE_CONNECT_STATUS_DISPLAY } from "@/lib/stripe-connect-display";
import { cn } from "@/lib/utils";

export function StripeConnectStatusPill({
  status,
  accountId,
  compact = false,
  className,
}: {
  status: StripeConnectStatus;
  accountId?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const badge = STRIPE_CONNECT_STATUS_DISPLAY[status];

  return (
    <div className={cn("space-y-0.5", className)}>
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 font-medium",
          compact ? "text-[10px]" : "text-[11px]",
          badge.className,
        )}
      >
        {badge.label}
      </span>
      {accountId && !compact ? (
        <p className="font-mono text-[10px] text-muted-foreground">{accountId}</p>
      ) : null}
    </div>
  );
}
