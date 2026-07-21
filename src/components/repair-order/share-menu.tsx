"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Share2, ClipboardList, FileText, Receipt, SlidersHorizontal, History } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareEstimateDialog } from "@/components/repair-order/share-estimate-dialog";
import { ShareInvoiceDialog } from "@/components/repair-order/share-invoice-dialog";
import { ShareInspectionDialog } from "@/components/inspections/share-inspection-dialog";
import { cn } from "@/lib/utils";

export function ShareMenu({
  roId,
  roNumber,
  customerFirstName,
  customerName,
  shopName,
  phones,
  email,
  invoiceId,
  invoiceNumber,
  inspectionId,
  trigger,
  contentAlign = "end",
  contentClassName,
}: {
  roId: string;
  roNumber: number;
  customerFirstName: string;
  /** Full display name for share recipient header. */
  customerName?: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
  invoiceId: string | null;
  invoiceNumber: number | null;
  inspectionId?: string | null;
  /** Custom trigger (e.g. MoneyCard SEND). Defaults to header share icon. */
  trigger?: ReactNode;
  contentAlign?: "start" | "center" | "end";
  contentClassName?: string;
}) {
  const router = useRouter();
  const [shareEstimateOpen, setShareEstimateOpen] = useState(false);
  const [shareInvoiceOpen, setShareInvoiceOpen] = useState(false);
  const [shareInspectionOpen, setShareInspectionOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild={trigger != null}
          aria-label="Share"
          title="Share"
          className={
            trigger
              ? undefined
              : "rounded-md p-1.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent"
          }
        >
          {trigger ?? <Share2 className="size-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={contentAlign} className={cn("w-52", contentClassName)}>
          <DropdownMenuItem
            disabled={!inspectionId}
            onSelect={() => inspectionId && setShareInspectionOpen(true)}
          >
            <ClipboardList className="size-4" /> Share Inspection
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareEstimateOpen(true)}>
            <FileText className="size-4" /> Share Estimate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareInvoiceOpen(true)}>
            <Receipt className="size-4" /> Share Invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/settings/ro-settings?section=quote-invoice-display")}>
            <SlidersHorizontal className="size-4" /> Transparency Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push(`/repair-orders/${roId}?section=auth-history`)}>
            <History className="size-4" /> Authorization History
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareEstimateDialog
        open={shareEstimateOpen}
        onOpenChange={setShareEstimateOpen}
        roId={roId}
        roNumber={roNumber}
        customerFirstName={customerFirstName}
        customerName={customerName}
        shopName={shopName}
        phones={phones}
        email={email}
      />

      <ShareInvoiceDialog
        open={shareInvoiceOpen}
        onOpenChange={setShareInvoiceOpen}
        repairOrderId={roId}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        customerFirstName={customerFirstName}
        customerName={customerName}
        shopName={shopName}
        phones={phones}
        email={email}
      />

      {inspectionId ? (
        <ShareInspectionDialog
          open={shareInspectionOpen}
          onOpenChange={setShareInspectionOpen}
          inspectionId={inspectionId}
          roNumber={roNumber}
          customerFirstName={customerFirstName}
          customerName={customerName}
          shopName={shopName}
          phones={phones}
          email={email}
        />
      ) : null}
    </>
  );
}
