import { VendorSetupShell } from "@/components/vendors/vendor-setup-shell";
import { GoogleReviewsConnectPanel } from "@/components/marketing/google-reviews/google-reviews-connect-panel";
import { vendorByKey } from "@/lib/integrations";
import { getIntegrationStatus } from "@/server/integrations";

export const metadata = { title: "Google Reviews — Vendor Integrations" };
export const dynamic = "force-dynamic";

export default async function GoogleReviewsIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; message?: string; error?: string }>;
}) {
  const vendor = vendorByKey("google-reviews");
  const status = await getIntegrationStatus("google-reviews");
  const params = await searchParams;

  return (
    <VendorSetupShell vendor={vendor} status={status}>
      <section className="space-y-2 rounded-lg border bg-card p-4 text-sm">
        <h3 className="font-medium">Before you connect</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Your shop has a verified listing on Google Maps (Google Business Profile).</li>
          <li>
            You sign in with a Google account that is an <strong>owner or manager</strong> of that
            listing — not just a personal Gmail with no shop access.
          </li>
          <li>
            You allow ShopRally to read reviews and post replies on your behalf.
          </li>
        </ul>
      </section>

      <GoogleReviewsConnectPanel
        status={status}
        oauthMessage={params.connected ? (params.message ?? "Google account connected.") : null}
        oauthError={params.error ?? null}
      />
    </VendorSetupShell>
  );
}
