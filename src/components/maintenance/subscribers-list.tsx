"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Ticket, Zap } from "lucide-react";

import { AddSubscriberDialog, type EnrollPlanOption } from "@/components/maintenance/add-subscriber-dialog";
import { SendPlansToCustomer } from "@/components/maintenance/send-plans-to-customer";
import { SharePlansLinkButton } from "@/components/maintenance/share-plans-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelPlanSubscription } from "@/server/actions/maintenance-subscriptions";
import type { SubscriberListRow } from "@/server/maintenance-subscriptions";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/datetime";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAST_DUE: "bg-amber-100 text-amber-900",
  PENDING: "bg-blue-100 text-blue-800",
  PAUSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
};

const PAYMENT_LABELS: Record<string, string> = {
  PAY_IN_FULL: "Pay in full",
  MONTHLY: "Monthly",
  ANNUAL: "Annual",
  MANUAL: "Manual / comp",
};

const CANCELLABLE = new Set(["ACTIVE", "PAST_DUE", "PENDING", "PAUSED"]);

type Props = {
  rows: SubscriberListRow[];
  search?: string;
  plansUrl: string;
  shopName: string;
  activePlans: EnrollPlanOption[];
};

export function SubscribersListClient({
  rows,
  search,
  plansUrl,
  shopName,
  activePlans,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cancelSub(id: string, customerName: string) {
    if (!window.confirm(`Cancel membership for ${customerName}?`)) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await cancelPlanSubscription(id);
      setPendingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="relative min-w-0 flex-1 basis-56 sm:max-w-md" action="/maintenance-programs/subscribers">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search customer, phone, or plan"
            className="pl-9"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <SharePlansLinkButton plansUrl={plansUrl} shopName={shopName} />
          <AddSubscriberDialog plans={activePlans} />
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/maintenance-programs/redeem">
              <Zap className="size-4" />
              Express redeem
            </Link>
          </Button>
        </div>
      </div>

      <SendPlansToCustomer plansUrl={plansUrl} shopName={shopName} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground space-y-4">
          <Ticket className="mx-auto size-8 opacity-40" />
          <div>
            <p className="font-medium text-foreground">No subscribers yet</p>
            <p className="mt-1 max-w-md mx-auto">
              Add a subscriber at the counter or share your public signup link with customers.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <AddSubscriberDialog plans={activePlans} />
            <SharePlansLinkButton plansUrl={plansUrl} shopName={shopName} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Vehicle</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Payment</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Progress</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Enrolled</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium w-[100px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers?customer=${row.customerId}`}
                      className="font-medium hover:text-brand-navy"
                    >
                      {row.customerName}
                    </Link>
                    {row.phone ? <p className="text-xs text-muted-foreground">{row.phone}</p> : null}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{row.vehicleLabel}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/maintenance-programs/plans/${row.planId}`}
                      className="hover:text-brand-navy"
                    >
                      {row.planName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {PAYMENT_LABELS[row.paymentMode] ?? row.paymentMode}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="secondary">{row.progress}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {fmtDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_STYLE[row.status] ?? STATUS_STYLE.PENDING,
                      )}
                    >
                      {row.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/maintenance-programs/subscribers/${row.id}`}>View</Link>
                      </Button>
                      {CANCELLABLE.has(row.status) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={isPending && pendingId === row.id}
                          onClick={() => cancelSub(row.id, row.customerName)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
