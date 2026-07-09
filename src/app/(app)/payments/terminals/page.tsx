import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PaymentsTerminalsPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Terminals</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <Plus className="size-4" />
            Add terminal
          </Button>
          <Button size="sm" className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90" disabled>
            <ShoppingCart className="size-4" />
            Order terminal
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <span className="rounded-md bg-brand-navy px-2.5 py-1 text-xs font-medium text-white">
            Terminals
          </span>
          <span className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground">Orders</span>
        </div>
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          <p>No terminals configured yet.</p>
          <p className="mt-2">
            Stripe Terminal (in-shop tap/chip) is planned for a future milestone. Connect your Stripe
            account on the{" "}
            <Link href="/payments/account" className="font-medium text-brand-navy hover:underline">
              Account
            </Link>{" "}
            tab first.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Need help? See{" "}
        <a
          href="https://docs.stripe.com/terminal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-navy hover:underline"
        >
          Stripe Terminal setup guide
        </a>{" "}
        or contact ShopRally support.
      </p>
    </div>
  );
}
