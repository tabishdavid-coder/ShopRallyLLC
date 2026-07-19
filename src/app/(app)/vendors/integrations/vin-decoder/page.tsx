import { CheckCircle2, CircleDashed } from "lucide-react";

import { VendorConnectForm } from "@/components/vendors/vendor-connect-form";
import { VendorSetupShell } from "@/components/vendors/vendor-setup-shell";
import { vendorByKey } from "@/lib/integrations";
import { getIntegrationStatus } from "@/server/integrations";

export const metadata = { title: "VIN Decoder — Vendor Integrations" };
export const dynamic = "force-dynamic";

export default async function VinDecoderIntegrationPage() {
  const vendor = vendorByKey("vin-decoder");
  const status = await getIntegrationStatus("vin-decoder");
  const c = status.safeConfig;
  const autodevEnv = Boolean(process.env.AUTODEV_API_KEY?.trim());

  return (
    <VendorSetupShell vendor={vendor} status={status}>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-medium text-sm">Active providers</h3>
        <ul className="space-y-2 text-sm">
          <StatusRow ok label="NHTSA vPIC" note="Always active for VIN decode on Add Vehicle and Create RO." />
          <StatusRow
            ok={autodevEnv || Boolean(c.hasAutodevApiKey)}
            label="Auto.dev"
            note="Rich US-market decode + license plate → VIN when configured."
          />
          <StatusRow
            ok={Boolean(c.hasDataOneApiKey)}
            label="DataOne / VinAudit (upgrade path)"
            note="Paid providers — swap VinService provider when account is ready."
          />
        </ul>
      </section>

      <VendorConnectForm
        vendorKey="vin-decoder"
        initial={{
          provider: String(c.provider ?? "nhtsa"),
          autodevApiKey: "",
          dataOneApiKey: "",
        }}
        fields={[
          {
            name: "provider",
            label: "Preferred paid provider",
            type: "select",
            options: [
              { value: "nhtsa", label: "NHTSA only" },
              { value: "autodev", label: "Auto.dev" },
              { value: "dataone", label: "DataOne / VinAudit" },
            ],
          },
          {
            name: "autodevApiKey",
            label: "Auto.dev API key",
            type: "password",
            placeholder: c.hasAutodevApiKey ? "•••••••• (saved)" : "Optional shop-level key",
            hint: "Platform AUTODEV_API_KEY in .env takes precedence when set.",
          },
          {
            name: "dataOneApiKey",
            label: "DataOne / VinAudit key",
            type: "password",
            placeholder: c.hasDataOneApiKey ? "•••••••• (saved)" : "Future provider swap",
          },
        ]}
      />
    </VendorSetupShell>
  );
}

function StatusRow({ ok, label, note }: { ok: boolean; label: string; note: string }) {
  const Icon = ok ? CheckCircle2 : CircleDashed;
  return (
    <li className="flex gap-2">
      <Icon className={`mt-0.5 size-4 shrink-0 ${ok ? "text-emerald-600" : "text-muted-foreground/60"}`} />
      <div>
        <span className="font-medium">{label}</span>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </li>
  );
}
