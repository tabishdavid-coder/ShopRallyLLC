import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = { title: "QuickBooks Export — ShopRally" };

export default function QuickBooksSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">QuickBooks export</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download invoices as CSV for manual import into QuickBooks Online or Desktop.
          Live API sync (OAuth + automatic journal entries) is planned for M9.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-medium">Invoice export</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Includes invoice #, RO #, customer, dates, subtotal, tax, total, paid, and balance.
        </p>
        <Button asChild className="mt-4 gap-1.5 bg-brand-navy hover:bg-brand-navy/90">
          <a href="/api/export/quickbooks">
            <Download className="size-4" />
            Download CSV
          </a>
        </Button>
      </div>

      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">QuickBooks Online API (coming soon)</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>OAuth connect per shop</li>
          <li>Auto-sync invoices and payments daily</li>
          <li>Map labor, parts, and tax to QB items</li>
        </ul>
        <Button asChild variant="link" className="mt-2 h-auto p-0 text-brand-navy">
          <Link href="https://developer.intuit.com/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 inline size-3.5" />
            Intuit developer docs
          </Link>
        </Button>
      </div>
    </div>
  );
}
