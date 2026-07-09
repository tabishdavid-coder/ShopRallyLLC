import { notFound } from "next/navigation";
import { AlertCircle, Clock } from "lucide-react";

import { ShopIntakeForm } from "@/components/platform/shop-intake-form";
import { getShopIntakeContext } from "@/server/actions/shop-intake";

export const metadata = { title: "Shop onboarding — ShopRally" };

export default async function ShopIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await getShopIntakeContext(token);
  if (!ctx) notFound();

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-brand-navy text-sm font-black leading-none text-white shadow-sm">
            <span>R</span>
            <span className="text-brand-red">P</span>
          </div>
          <span className="text-base font-bold tracking-tight">
            Kar<span className="text-brand-light">vio</span>
          </span>
        </div>

        {ctx.status === "open" ? (
          <ShopIntakeForm token={token} defaults={ctx.defaults} />
        ) : (
          <StatusMessage status={ctx.status} />
        )}
      </div>
    </div>
  );
}

function StatusMessage({ status }: { status: "used" | "expired" }) {
  const isExpired = status === "expired";
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      {isExpired ? (
        <Clock className="mx-auto size-10 text-amber-600" />
      ) : (
        <AlertCircle className="mx-auto size-10 text-muted-foreground" />
      )}
      <h2 className="mt-4 text-lg font-semibold text-brand-navy">
        {isExpired ? "This link has expired" : "This link has already been used"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {isExpired
          ? "Contact ShopRally to request a new shop onboarding link."
          : "If you need to update your submission, reach out to your ShopRally contact."}
      </p>
    </div>
  );
}
