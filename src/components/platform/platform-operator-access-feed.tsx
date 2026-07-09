import Link from "next/link";
import { Shield } from "lucide-react";

import { listRecentShopCrmAccessEvents } from "@/server/platform/shop-crm-access";

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Platform-wide SHOP_CRM_ENTERED audit — operator PII access trail. */
export async function PlatformOperatorAccessFeed({ limit = 25 }: { limit?: number }) {
  const events = await listRecentShopCrmAccessEvents(limit);

  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Shield className="size-4" />
            Operator Shop CRM access log
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When platform admins enter a tenant CRM, access is logged for compliance. Per-shop
            history is on each shop detail page.
          </p>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No logged entries yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/20 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Operator</th>
              <th className="px-4 py-2 font-medium">Shop</th>
              <th className="px-4 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const meta = (e.metadata ?? {}) as { source?: string };
              return (
                <tr key={e.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(e.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-brand-navy">
                    {e.actorEmail ?? "Operator"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/platform/shops/${e.shopId}`}
                      className="text-brand-navy hover:underline"
                    >
                      {e.shopName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{meta.source ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
