import { VendorConnectForm } from "@/components/vendors/vendor-connect-form";
import { VendorSetupShell } from "@/components/vendors/vendor-setup-shell";
import { vendorByKey } from "@/lib/integrations";
import { getIntegrationStatus } from "@/server/integrations";

export const metadata = { title: "Carfax — Vendor Integrations" };
export const dynamic = "force-dynamic";

export default async function CarfaxIntegrationPage() {
  const vendor = vendorByKey("carfax");
  const status = await getIntegrationStatus("carfax");
  const c = status.safeConfig;

  return (
    <VendorSetupShell vendor={vendor} status={status}>
      <section className="space-y-2 rounded-lg border bg-card p-4 text-sm">
        <h3 className="font-medium">QuickVIN vs full report</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Service History Check</span> — pulls prior repair
            records onto the RO when a VIN is present (what ShopRally implements today).
          </li>
          <li>
            <span className="font-medium text-foreground">QuickVIN / full Carfax report</span> — separate
            Carfax for Business products; wire after your partner agreement specifies endpoints.
          </li>
          <li>
            A <span className="font-medium text-foreground">Run Carfax</span> action on vehicles/ROs will be
            enabled once live credentials are verified — today use the Service History panel on the RO.
          </li>
        </ul>
      </section>

      <VendorConnectForm
        vendorKey="carfax"
        initial={c}
        fields={[
          { name: "productDataId", label: "Product Data ID", placeholder: "From Carfax onboarding" },
          { name: "locationId", label: "Location ID" },
          { name: "partnerId", label: "Partner ID (optional)" },
          {
            name: "apiKey",
            label: "API key (optional)",
            type: "password",
            placeholder: c.hasApiKey ? "•••••••• (saved)" : "If issued by Carfax",
          },
        ]}
        roLink={{ label: "Service History on ROs", href: "/job-board" }}
      />
    </VendorSetupShell>
  );
}
