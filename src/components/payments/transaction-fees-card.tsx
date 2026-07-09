import { CreditCard, ExternalLink, Wallet } from "lucide-react";
import Link from "next/link";

/**
 * Stripe Connect fee disclosure for the Payments account sidebar.
 * Rates are set by Stripe — ShopRally does not add a per-transaction platform fee in v1.
 */
export function TransactionFeesCard() {
  return (
    <aside className="rounded-lg border bg-card p-4">
      <h3 className="font-semibold">Transaction fees</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Stripe deducts processing fees from each payment per your merchant agreement. ShopRally does
        not add a per-transaction platform fee in v1.
      </p>

      <div className="mt-4 space-y-4">
        <FeeGroup
          icon={CreditCard}
          title="Card payments"
          description="In-person (terminal, tap) and card-not-present (email, text-to-pay) rates differ."
        />
        <FeeGroup
          icon={Wallet}
          title="Buy now, pay later"
          description="Affirm, Klarna, and other BNPL methods have separate Stripe rates when enabled."
          footnote="BNPL requires enabling in your Stripe Dashboard — not yet wired in ShopRally."
        />
      </div>

      <Link
        href="https://stripe.com/pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-light hover:underline"
      >
        View current Stripe pricing
        <ExternalLink className="size-3.5" />
      </Link>
    </aside>
  );
}

function FeeGroup({
  icon: Icon,
  title,
  description,
  footnote,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
  footnote?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-brand-navy/70" />
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {footnote ? <p className="mt-2 text-xs text-muted-foreground">{footnote}</p> : null}
    </div>
  );
}
