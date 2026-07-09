import type { EntitlementKind } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  kind: EntitlementKind;
  label: string;
  usedCount: number;
  remainingCount: number | null;
  quantity: number | null;
  nextEligibleAt?: Date | string | null;
};

export function SubscriptionProgressList({ items }: { items: Item[] }) {
  const visible = items.filter(
    (i) =>
      i.kind === "COUNTED" ||
      i.kind === "COUPON" ||
      i.kind === "UNLIMITED" ||
      i.kind === "INTERVAL" ||
      i.kind === "EVERY_VISIT",
  );

  if (!visible.length) {
    return <p className="text-sm text-muted-foreground">No trackable services on this plan.</p>;
  }

  return (
    <ul className="space-y-4">
      {visible.map((item) => (
        <li key={item.id}>
          <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {item.kind === "EVERY_VISIT"
                ? "Every visit"
                : item.kind === "COUNTED" || item.kind === "COUPON"
                  ? `${item.usedCount} / ${item.quantity ?? "—"}`
                  : item.nextEligibleAt &&
                      new Date(item.nextEligibleAt) > new Date()
                    ? "Scheduled"
                    : "Eligible"}
            </span>
          </div>
          {item.kind === "COUNTED" || item.kind === "COUPON" ? (
            <ProgressBar
              value={item.usedCount}
              max={item.quantity ?? 1}
            />
          ) : item.kind === "EVERY_VISIT" ? (
            <div className="h-2 rounded-full bg-brand-light/40" />
          ) : (
            <ProgressBar value={item.usedCount} max={Math.max(item.usedCount + 1, 4)} />
          )}
        </li>
      ))}
    </ul>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full bg-brand-navy transition-all")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MemberDigitalCard({
  shopName,
  planName,
  memberName,
  vehicleLabel,
  token,
}: {
  shopName: string;
  planName: string;
  memberName: string;
  vehicleLabel: string;
  token: string;
}) {
  return (
    <div className="rounded-xl border-2 border-brand-navy bg-gradient-to-br from-brand-navy to-brand-navy/90 p-5 text-white shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/70">Member</p>
          <p className="text-lg font-bold">{shopName}</p>
        </div>
        <div className="rounded bg-white/15 px-2 py-1 text-xs font-mono">{token.slice(0, 8)}</div>
      </div>
      <div className="mt-6 space-y-1">
        <p className="text-sm font-semibold">{memberName}</p>
        <p className="text-sm text-white/85">{planName}</p>
        <p className="text-xs text-white/70">{vehicleLabel}</p>
      </div>
    </div>
  );
}
