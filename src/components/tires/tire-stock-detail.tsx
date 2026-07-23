"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftRight, ChevronLeft, Pencil, Trash2 } from "lucide-react";

import { AdjustTireQuantityDialog } from "@/components/tires/adjust-tire-quantity-dialog";
import { TireStockForm } from "@/components/tires/tire-stock-form";
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
import {
  TIRE_CONDITION_COLORS,
  TIRE_CONDITION_LABELS,
  TIRE_SEASONALITY_COLORS,
  TIRE_SEASONALITY_LABELS,
  tireStockLabel,
} from "@/lib/tire-stock";
import { cn } from "@/lib/utils";
import { deactivateTireStock } from "@/server/actions/tire-stock";
import type { TireStockDetail } from "@/server/tire-stock";

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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold", highlight && "text-brand-red")}>{value}</p>
    </div>
  );
}

export function TireStockDetailView({
  tire,
  editMode,
}: {
  tire: TireStockDetail;
  editMode: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const isLow = tire.reorderPoint > 0 && tire.quantityOnHand <= tire.reorderPoint;

  if (editMode) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link href={`/tires/${tire.id}`}>
            <ChevronLeft className="size-4" />
            Back to tire
          </Link>
        </Button>
        <TireStockForm tire={tire} mode="edit" />
      </div>
    );
  }

  function handleDeactivate() {
    if (!confirm("Deactivate this tire SKU? It will be removed from the tires list.")) return;
    startTransition(async () => {
      const result = await deactivateTireStock(tire.id);
      if (result.ok) router.push("/tires");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tires">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{tire.stockNumber}</h1>
              <Badge variant="secondary" className={TIRE_CONDITION_COLORS[tire.condition]}>
                {TIRE_CONDITION_LABELS[tire.condition]}
              </Badge>
              {tire.seasonality ? (
                <Badge variant="secondary" className={TIRE_SEASONALITY_COLORS[tire.seasonality]}>
                  {TIRE_SEASONALITY_LABELS[tire.seasonality]}
                </Badge>
              ) : null}
              {isLow ? (
                <Badge variant="outline" className="border-brand-red/40 text-brand-red">
                  Low stock
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground">{tireStockLabel(tire)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdjustOpen(true)}>
            <ArrowLeftRight className="size-4" />
            Adjust quantity
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/tires/${tire.id}?edit=1`}>
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
        <DetailCard label="Qty on hand" value={String(tire.quantityOnHand)} highlight={isLow} />
        <DetailCard label="Reorder point" value={String(tire.reorderPoint)} />
        <DetailCard label="Reorder qty" value={String(tire.reorderQty)} />
        <DetailCard label="Bin" value={tire.binLocation ?? "—"} />
        <DetailCard label="Size" value={tire.size} />
        {tire.width && tire.aspectRatio && tire.rimDiameter ? (
          <DetailCard
            label="Structured size"
            value={`${tire.width} / ${tire.aspectRatio} / R${tire.rimDiameter}`}
          />
        ) : null}
        <DetailCard
          label="Seasonality"
          value={tire.seasonality ? TIRE_SEASONALITY_LABELS[tire.seasonality] : "—"}
        />
        <DetailCard label="Load / speed" value={tire.loadSpeed ?? "—"} />
        <DetailCard label="Cost" value={formatCents(tire.costCents)} />
        <DetailCard label="Retail" value={formatCents(tire.retailCents)} />
        <DetailCard label="DOT" value={tire.dotCode ?? "—"} />
        <DetailCard
          label="Tread (32nds)"
          value={tire.treadDepth32nds != null ? String(tire.treadDepth32nds) : "—"}
        />
      </div>

      {tire.notes ? (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{tire.notes}</p>
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
            {tire.adjustments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No adjustments recorded.
                </TableCell>
              </TableRow>
            ) : (
              tire.adjustments.map((a) => (
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

      <AdjustTireQuantityDialog
        tireId={tire.id}
        stockNumber={tire.stockNumber}
        currentQty={tire.quantityOnHand}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
    </div>
  );
}
