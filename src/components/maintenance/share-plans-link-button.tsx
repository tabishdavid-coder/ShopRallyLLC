"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Link2, Mail, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SMS_ENABLED } from "@/lib/features";
import { SharePlansLinkDialog, type PlansShareCustomer } from "@/components/maintenance/share-plans-link-dialog";
import { cn } from "@/lib/utils";

type Props = {
  plansUrl: string;
  shopName: string;
  customer?: PlansShareCustomer | null;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  className?: string;
};

export function SharePlansLinkButton({
  plansUrl,
  shopName,
  customer,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard?.writeText(plansUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function mailtoLink() {
    const subject = encodeURIComponent(`Maintenance plans — ${shopName}`);
    const body = encodeURIComponent(
      `Browse our maintenance plans and sign up online: ${plansUrl}`,
    );
    const to = customer?.email ? encodeURIComponent(customer.email) : "";
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function smsLink() {
    const body = encodeURIComponent(
      `Sign up for a maintenance plan with ${shopName}: ${plansUrl}`,
    );
    const phone = customer?.phone?.replace(/\D/g, "") ?? "";
    window.location.href = phone ? `sms:+1${phone.slice(-10)}?&body=${body}` : `sms:?&body=${body}`;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={cn("gap-1.5", className)}>
            <Link2 className="size-4" />
            Share signup link
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={copyLink}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : "Copy link"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={mailtoLink}>
            <Mail className="size-4" />
            Email {customer ? "customer" : "link"}
          </DropdownMenuItem>
          {SMS_ENABLED ? (
            <DropdownMenuItem onClick={smsLink}>
              <MessageSquare className="size-4" />
              Text {customer ? "customer" : "link"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Send className="size-4" />
            Send to customer…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SharePlansLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plansUrl={plansUrl}
        shopName={shopName}
        customer={customer}
      />
    </>
  );
}
