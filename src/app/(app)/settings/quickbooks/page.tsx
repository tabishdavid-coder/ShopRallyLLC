import { CircleDashed, Download, ExternalLink, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsHero } from "@/components/settings/settings-hero";

export const metadata = { title: "QuickBooks Export — ShopRally" };

export default function QuickBooksSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SettingsHero
        icon={FileSpreadsheet}
        title="QuickBooks"
        description="Download invoices as CSV for manual import into QuickBooks Online or Desktop."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 font-medium">
            <CircleDashed className="size-3" aria-hidden />
            Live sync planned for M9
          </span>
        }
      />

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
            <Download className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold">Invoice export</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Includes invoice #, RO #, customer, dates, subtotal, tax, total, paid, and balance.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end border-t pt-4">
          <Button asChild className="gap-1.5">
            <a href="/api/export/quickbooks">
              <Download className="size-4" />
              Download CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/20 p-5 text-sm">
        <p className="font-medium text-foreground">QuickBooks Online API (coming soon)</p>
        <ul className="mt-3 space-y-1.5 text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            OAuth connect per shop
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            Auto-sync invoices and payments daily
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            Map labor, parts, and tax to QB items
          </li>
        </ul>
        <a
          href="https://developer.intuit.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline"
        >
          Intuit developer docs
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
