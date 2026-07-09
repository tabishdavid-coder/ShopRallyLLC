import Link from "next/link";

import { VendorConnectForm } from "@/components/vendors/vendor-connect-form";
import { VendorSetupShell } from "@/components/vendors/vendor-setup-shell";
import { vendorByKey } from "@/lib/integrations";
import { getIntegrationStatus } from "@/server/integrations";

export const metadata = { title: "Weldon Tire — Vendor Integrations" };
export const dynamic = "force-dynamic";

export default async function WeldonIntegrationPage() {
  const vendor = vendorByKey("weldon");
  const status = await getIntegrationStatus("weldon");
  const c = status.safeConfig;

  return (
    <VendorSetupShell vendor={vendor} status={status}>
      <section className="space-y-2 rounded-lg border bg-card p-4 text-sm">
        <h3 className="font-medium">Approval-before-buy workflow</h3>
        <p className="text-muted-foreground">
          Website tire deposits create orders in{" "}
          <span className="font-medium text-foreground">PENDING_SUPPLIER_APPROVAL</span>. A manager approves on
          the tires queue before anything is purchased.
        </p>
        <Link href="/tires?status=PENDING_SUPPLIER_APPROVAL" className="font-medium text-brand-navy hover:underline">
          Open tire approval queue →
        </Link>
      </section>

      <VendorConnectForm
        vendorKey="weldon"
        initial={c}
        fields={[
          { name: "accountNumber", label: "Weldon account #", placeholder: "Commercial account number" },
          { name: "territory", label: "Territory / rep region", placeholder: "Optional" },
          {
            name: "mode",
            label: "Ordering mode",
            type: "select",
            options: [
              { value: "manual", label: "Manual — place orders in weldontire.net portal" },
              { value: "api", label: "API — Tireweb/Tirewire when programmatic ordering is available" },
            ],
          },
        ]}
      />
    </VendorSetupShell>
  );
}
