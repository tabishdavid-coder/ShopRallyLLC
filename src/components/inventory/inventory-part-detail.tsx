"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftRight, ChevronLeft, Pencil, Trash2 } from "lucide-react";

import { AdjustQuantityDialog } from "@/components/inventory/adjust-quantity-dialog";
import { InventoryPartForm } from "@/components/inventory/inventory-part-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deactivateInventoryPart } from "@/server/actions/inventory";
import type { InventoryPartDetail } from "@/server/inventory";

export function InventoryPartDetailView({
  part,
  editMode,
}: {
  part: InventoryPartDetail;
  editMode: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const isLow =
    part.reorderPoint > 0 && part.quantityOnHand <= part.reorderPoint;

  if (editMode) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link href={`/inventory/${part.id}`}>
            <ChevronLeft className="size-4" />
            Back to part
          </Link>
        </Button>
        <InventoryPartForm part={part} mode="edit" />
      </div>
    );
  }

  function handleDeactivate() {
    if (!confirm("Deactivate this part? It will be removed from the inventory list.")) return;
    startTransition(async () => {
      const result = await deactivateInventoryPart(part.id);
      if (result.ok) router.push("/inventory");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{part.partNumber}</h1>
              {isLow ? (
                <Badge variant="outline" className="border-brand-red/40 text-brand-red">
                  Low stock
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground">{part.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdjustOpen(true)}>
            <ArrowLeftRight className="size-4" />
            Adjust quantity
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/inventory/${part.id}?edit=1`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-brand-red"
            disabled={pending}
            onClick={handleDeactivate}
          >
            <Trash2 className="size-4" />
            Deactivate
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailCard label="Qty on hand" value={String(part.quantityOnHand)} highlight={isLow} />
        <DetailCard label="Reorder point" value={String(part.reorderPoint)} />
        <DetailCard label="Reorder qty" value={String(part.reorderQty)} />
        <DetailCard label="Bin" value={part.binLocation ?? "—"} />
        <DetailCard label="Cost" value={formatCents(part.costCents)} />
        <DetailCard label="Retail" value={formatCents(part.retailCents)} />
        <DetailCard label="Vendor" value={part.vendorName ?? "—"} />
        <DetailCard label="Category" value={part.category ?? "—"} />
      </div>

      {part.notes ? (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Notes</p>
          <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{part.notes}</p>
        </div>
      ) : null}

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Adjustment history</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Qty after</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {part.adjustments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No adjustments recorded.
                </TableCell>
              </TableRow>
            ) : (
              part.adjustments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">
                    {fmtDateTime(a.createdAt, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-medium",
                      a.delta > 0 ? "text-emerald-600" : "text-brand-red",
                    )}
                  >
                    {a.delta > 0 ? `+${a.delta}` : a.delta}
                  </TableCell>
                  <TableCell>{a.quantityAfter}</TableCell>
                  <TableCell>{a.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdjustQuantityDialog
        partId={part.id}
        partNumber={part.partNumber}
        currentQty={part.quantityOnHand}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
    </div>
  );
}

function DetailCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold", highlight && "text-brand-red")}>{value}</p>
    </div>
  );
}
