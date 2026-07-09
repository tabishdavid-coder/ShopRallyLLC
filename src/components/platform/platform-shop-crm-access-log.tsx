import { listShopCrmAccessEvents } from "@/server/platform/shop-crm-access";

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function PlatformShopCrmAccessLog({ shopId }: { shopId: string }) {
  const events = await listShopCrmAccessEvents(shopId, 10);

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-navy">Operator Shop CRM access</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Logged when a platform admin enters this tenant via Enter shop CRM (
        <code className="rounded bg-muted px-1">SHOP_CRM_ENTERED</code>).
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No logged entries yet.</p>
      ) : (
        <ul className="mt-3 divide-y text-sm">
          {events.map((e) => {
            const meta = (e.metadata ?? {}) as { source?: string; operator?: string };
            return (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-brand-navy">{e.actorEmail ?? "Operator"}</span>
                <span className="text-xs text-muted-foreground">{fmtDateTime(e.createdAt)}</span>
                {meta.source ? (
                  <span className="w-full text-xs text-muted-foreground">via {meta.source}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
