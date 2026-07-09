"use client";

import { useState } from "react";

import { EstimateLiveTotalsBar } from "@/components/repair-order/estimate-live-totals-bar";
import { EstimateDepositRequestDialog } from "@/components/estimate-building/estimate-deposit-request-dialog";
import { DepositRequestStatus } from "@/generated/prisma";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";

type DepositInfo = {
  id: string;
  amountCents: number;
  note: string | null;
  status: DepositRequestStatus;
  sentAt: Date | null;
  paidAt: Date | null;
  shareUrl: string;
};

/** Lab-only sticky totals bar with Request deposit action (main estimate tab unchanged). */
export function EstimateLabLiveTotalsBar({
  roId,
  roNumber,
  customerName,
  phone,
  approvable,
  gpGoalCents,
  estimateTotalCents,
  deposit,
}: {
  roId: string;
  roNumber: number;
  customerName: string;
  phone: string | null;
  approvable: boolean;
  gpGoalCents?: number | null;
  estimateTotalCents: number;
  deposit: DepositInfo | null;
}) {
  const [depositOpen, setDepositOpen] = useState(false);

  const depositPaid = deposit?.status === DepositRequestStatus.PAID;
  const depositPending = deposit?.status === DepositRequestStatus.PENDING;

  const depositAction = (
    <button
      type="button"
      onClick={() => setDepositOpen(true)}
      title={
        depositPaid
          ? `Deposit ${formatCents(deposit!.amountCents)} received`
          : depositPending
            ? `Deposit ${formatCents(deposit!.amountCents)} pending`
            : "Request a deposit from the customer"
      }
      className={cn(
        "flex items-center justify-center gap-1 rounded-md border transition-colors",
        "border-brand-light/50 bg-white/10 text-white hover:border-brand-light hover:bg-white/20",
        depositPaid && "border-emerald-400/50 bg-emerald-500/20",
        depositPending && !depositPaid && "border-amber-400/50 bg-amber-500/20",
      )}
    >
      <Wallet className="size-3.5 shrink-0" />
      <span className="hidden @md/totals:inline">
        {depositPaid ? "Deposit received" : depositPending ? "Deposit pending" : "Request deposit"}
      </span>
      <span className="@md/totals:hidden">Deposit</span>
    </button>
  );

  return (
    <>
      <EstimateLiveTotalsBar
        roId={roId}
        roNumber={roNumber}
        customerName={customerName}
        phone={phone}
        approvable={approvable}
        gpGoalCents={gpGoalCents}
        beforeApproveAction={depositAction}
      />

      <EstimateDepositRequestDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        roId={roId}
        roNumber={roNumber}
        estimateTotalCents={estimateTotalCents}
        existingDeposit={deposit}
      />
    </>
  );
}
