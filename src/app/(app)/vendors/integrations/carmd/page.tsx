import { VendorSetupShell } from "@/components/vendors/vendor-setup-shell";
import { CarMdSetupPanel } from "@/components/vendors/carmd-setup-panel";
import { vendorByKey } from "@/lib/integrations";
import { getIntegrationStatus } from "@/server/integrations";

export const metadata = { title: "CarMD — Vendor Integrations" };
export const dynamic = "force-dynamic";

export default async function CarMdIntegrationPage() {
  const vendor = vendorByKey("carmd");
  const status = await getIntegrationStatus("carmd");

  return (
    <VendorSetupShell vendor={vendor} status={status}>
      <CarMdSetupPanel envVars={vendor.envVars} />
    </VendorSetupShell>
  );
}
