import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STATE_META, type VendorDefinition } from "@/lib/integrations";
import type { VendorIntegrationStatus } from "@/lib/integrations";

export function VendorSetupShell({
  vendor,
  status,
  children,
}: {
  vendor: VendorDefinition;
  status: VendorIntegrationStatus;
  children: React.ReactNode;
}) {
  const meta = STATE_META[status.state];
  const banner =
    status.state === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : status.state === "configured"
        ? "border-brand-light/30 bg-brand-light/10 text-brand-navy"
        : status.state === "mock"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 gap-1.5 text-brand-navy">
          <Link href="/vendors/integrations">
            <ArrowLeft className="size-4" />
            Vendor integrations
          </Link>
        </Button>
        <h2 className="text-lg font-semibold">{vendor.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{vendor.description}</p>
      </div>

      <div className={`rounded-lg border px-4 py-3 text-sm ${banner}`}>
        <p className="font-medium">
          {meta.label}
          {status.envConfigured ? " · platform env detected" : null}
        </p>
        <p className="mt-1 opacity-90">{status.detail}</p>
      </div>

      {children}

      <section className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <h3 className="font-medium text-foreground">Partnership required</h3>
        <p>{vendor.partnershipNote}</p>
        {vendor.envVars.length ? (
          <p className="font-mono text-[11px]">{vendor.envVars.join(", ")}</p>
        ) : null}
        <p className="text-xs">
          Credentials are stored server-side per shop. Encryption at rest is planned — do not commit secrets to git.
        </p>
      </section>
    </div>
  );
}
