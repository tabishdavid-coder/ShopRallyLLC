"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Printer, FileText, ClipboardList, Receipt, Camera, SlidersHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PrintMenuProps = {
  roId: string;
  /** Custom trigger (e.g. orange rail Print button). Defaults to header icon. */
  trigger?: ReactNode;
  contentAlign?: "start" | "center" | "end";
  contentClassName?: string;
};

export function PrintMenu({
  roId,
  trigger,
  contentAlign = "end",
  contentClassName,
}: PrintMenuProps) {
  const open = (doc: string) => window.open(`/print/${roId}/${doc}`, "_blank");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild={trigger != null}
        aria-label="Print"
        title="Print"
        className={
          trigger
            ? undefined
            : "rounded-md p-1.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent"
        }
      >
        {trigger ?? <Printer className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={contentAlign} className={cn("w-56", contentClassName)}>
        <DropdownMenuItem onSelect={() => open("estimate")}>
          <FileText className="size-4" /> Print Estimate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open("repair-order")}>
          <ClipboardList className="size-4" /> Print Repair Order
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open("invoice")}>
          <Receipt className="size-4" /> Print Invoice
        </DropdownMenuItem>
        <DropdownMenuItem disabled title="Inspection print with images — coming soon">
          <Camera className="size-4" /> Print Inspection w/ Images
        </DropdownMenuItem>
        <DropdownMenuItem disabled title="Inspection print — coming soon">
          <ClipboardList className="size-4" /> Print Inspection
        </DropdownMenuItem>
        <DropdownMenuItem disabled title="Oil sticker print — coming soon">
          <Receipt className="size-4" /> Print Oil Sticker
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/ro-settings?section=quote-invoice-display" className="flex cursor-default items-center gap-2">
            <SlidersHorizontal className="size-4" /> Transparency
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
