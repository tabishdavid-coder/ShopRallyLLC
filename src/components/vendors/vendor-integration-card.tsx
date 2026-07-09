import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  STATE_META,
  type IntegrationConnectionState,
  type VendorDefinition,
} from "@/lib/integrations";
import type { VendorIntegrationStatus } from "@/lib/integrations";

export function VendorIntegrationCard({
  vendor,
  status,
  icon: Icon,
}: {
  vendor: VendorDefinition;
  status: VendorIntegrationStatus;
  icon: LucideIcon;
}) {
  const meta = STATE_META[status.state];
  const actionLabel = actionLabelFor(status.state);

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{vendor.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{vendor.integrationType}</p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm text-muted-foreground">{status.detail}</p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-[11px] text-muted-foreground/80">
          {status.envConfigured ? "Env + shop" : status.shopConfigured ? "Shop config" : "Env optional"}
        </p>
        <Button asChild size="sm" variant={status.state === "inactive" ? "default" : "outline"}>
          <Link href={vendor.href}>
            {actionLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function actionLabelFor(state: IntegrationConnectionState): string {
  if (state === "inactive") return "Connect";
  if (state === "connected") return "Manage";
  return "Configure";
}
