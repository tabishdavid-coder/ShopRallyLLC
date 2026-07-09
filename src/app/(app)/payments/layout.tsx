import { PaymentsTabs } from "@/components/payments/payments-tabs";

export const metadata = { title: "Payments — ShopRally" };

export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shop payment activity, Stripe Connect account, and terminals.
        </p>
      </div>
      <PaymentsTabs />
      <div>{children}</div>
    </div>
  );
}
