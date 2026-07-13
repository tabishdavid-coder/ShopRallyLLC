import { redirect } from "next/navigation";

import { VendorConnectForm } from "@/components/vendors/vendor-connect-form";
import { VendorSetupShell } from "@/components/vendors/vendor-setup-shell";
import { vendorByKey } from "@/lib/integrations";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { getIntegrationStatus } from "@/server/integrations";

export const metadata = { title: "PartsTech — Vendor Integrations" };
export const dynamic = "force-dynamic";

export default async function PartstechIntegrationPage() {
  const shopId = await getShopId();
  if (!(await canUseReleasedFeature(shopId, "parts"))) {
    redirect("/settings/subscription?upgrade=partsTech");
  }

  const vendor = vendorByKey("partstech");
  const status = await getIntegrationStatus("partstech");
  const c = status.safeConfig;

  return (
    <VendorSetupShell vendor={vendor} status={status}>
      <section className="space-y-2 rounded-lg border bg-card p-4 text-sm">
        <h3 className="font-medium">How PartsTech works</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Search catalogs and punch out to suppliers from the estimate tab Parts Hub.</li>
          <li>
            Save your PartsTech shop username + API key here. Partner ID comes from ShopRally platform
            onboarding (or set <code className="rounded bg-muted px-1">PARTSTECH_PARTNER_ID</code> in env).
          </li>
          <li>On Dev 3031, punchout return URLs use <code className="rounded bg-muted px-1">http://localhost:3031</code>.</li>
          <li>Password-based SSO may be used for punchout — store password here when provided by PartsTech.</li>
        </ul>
      </section>

      <VendorConnectForm
        vendorKey="partstech"
        initial={c}
        fields={[
          { name: "partnerId", label: "Partner ID (optional)", placeholder: "Platform env fallback if blank" },
          { name: "username", label: "Username / shop user" },
          {
            name: "apiKey",
            label: "API key",
            type: "password",
            placeholder: c.hasApiKey ? "•••••••• (saved)" : "PartsTech API key",
          },
          {
            name: "password",
            label: "Password (optional)",
            type: "password",
            placeholder: c.hasPassword ? "•••••••• (saved)" : "If using password auth",
          },
        ]}
        roLink={{ label: "Parts Hub on estimates", href: "/job-board" }}
      />
    </VendorSetupShell>
  );
}
