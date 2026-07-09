import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMaintenanceCheckoutSuccess } from "@/server/services/stripe-maintenance";
import { getShopByPlansSlug } from "@/server/maintenance-programs";

export const metadata = { title: "Enrollment complete" };

export default async function PlanSignupSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;

  const shopData = await getShopByPlansSlug(slug);
  if (!shopData) notFound();

  const result = sessionId
    ? await getMaintenanceCheckoutSuccess(slug, sessionId)
    : null;

  const active = result?.paid && result.status === "ACTIVE";

  return (
    <div className="min-h-dvh bg-muted/30 flex items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        {active ? (
          <CheckCircle2 className="mx-auto size-12 text-green-600" />
        ) : (
          <Loader2 className="mx-auto size-12 animate-spin text-brand-navy" />
        )}

        <h1 className="mt-4 text-xl font-bold">
          {active ? "Welcome to the club!" : "Processing your payment…"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {active ? (
            <>
              {result?.customerName ? `${result.customerName}, y` : "Y"}ou&apos;re enrolled in{" "}
              <span className="font-medium text-foreground">{result?.planName}</span> with{" "}
              {shopData.shop.name}.
            </>
          ) : (
            <>This usually takes a few seconds. Refresh if this page doesn&apos;t update.</>
          )}
        </p>

        {active && result?.memberPortalToken ? (
          <Button className="mt-6 w-full bg-brand-navy" asChild>
            <Link href={`/member/${result.memberPortalToken}`}>View my membership</Link>
          </Button>
        ) : null}

        <Button variant="outline" className="mt-2 w-full" asChild>
          <Link href={`/plans/${slug}`}>Back to plans</Link>
        </Button>
      </div>
    </div>
  );
}
