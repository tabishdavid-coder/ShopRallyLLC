"use client";

import { useState } from "react";
import { ExternalLink, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ShareInvoiceDialog } from "@/components/repair-order/share-invoice-dialog";
import { cn } from "@/lib/utils";

export function PaymentInvoiceActions({
  repairOrderId,
  invoiceId,
  invoiceNumber,
  shareUrl,
  stripeEnabled,
  customerFirstName,
  shopName,
  phones,
  email,
  compact = false,
}: {
  repairOrderId: string;
  invoiceId: string | null;
  invoiceNumber: number | null;
  shareUrl: string | null;
  stripeEnabled: boolean;
  customerFirstName: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("border-b border-border", compact ? "px-2.5 py-2" : "p-3 pb-0")}>
        <Button
          size={compact ? "sm" : "default"}
          className={cn(
            "gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90",
            compact ? "h-8 w-full text-xs" : "w-full",
          )}
          onClick={() => setOpen(true)}
        >
          <Receipt className={compact ? "size-3.5" : "size-4"} aria-hidden />
          Share invoice
        </Button>
        {shareUrl ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              "mt-1 w-full gap-1.5 text-brand-navy hover:bg-brand-light/15 hover:underline",
              compact ? "h-7 text-[11px]" : "text-xs font-medium",
            )}
          >
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" aria-hidden />
              Open public invoice
            </a>
          </Button>
        ) : null}
      </div>

      <ShareInvoiceDialog
        open={open}
        onOpenChange={setOpen}
        repairOrderId={repairOrderId}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        stripeEnabled={stripeEnabled}
        customerFirstName={customerFirstName}
        shopName={shopName}
        phones={phones}
        email={email}
      />
    </>
  );
}
