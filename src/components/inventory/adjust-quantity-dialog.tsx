"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adjustInventoryQuantity } from "@/server/actions/inventory";

const REASONS = [
  "Physical count",
  "Received shipment",
  "Used on RO",
  "Damaged / returned",
  "Transfer",
  "Other",
];

export function AdjustQuantityDialog({
  partId,
  partNumber,
  currentQty,
  open,
  onOpenChange,
}: {
  partId: string;
  partNumber: string;
  currentQty: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const qty = Math.max(0, parseInt(amount, 10) || 0);
  const delta = mode === "add" ? qty : -qty;
  const nextQty = currentQty + delta;

  function reset() {
    setMode("add");
    setAmount("1");
    setReason(REASONS[0]);
    setCustomReason("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      setError("Reason is required.");
      return;
    }
    if (qty <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    startTransition(async () => {
      const result = await adjustInventoryQuantity({
        partId,
        delta,
        reason: finalReason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust quantity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Part <span className="font-medium text-foreground">{partNumber}</span> — current QOH{" "}
            <span className="font-medium text-foreground">{currentQty}</span>
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => setMode("add")}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
            <Button
              type="button"
              variant={mode === "remove" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => setMode("remove")}
            >
              <Minus className="size-3.5" />
              Remove
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-qty">Quantity</Label>
            <Input
              id="adj-qty"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reason === "Other" ? (
              <Input
                placeholder="Describe the adjustment"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            ) : null}
          </div>
          <p className="text-sm">
            New quantity:{" "}
            <span
              className={
                nextQty < 0 ? "font-semibold text-brand-red" : "font-semibold text-foreground"
              }
            >
              {Math.max(0, nextQty)}
            </span>
          </p>
          {error ? <p className="text-sm text-brand-red">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || nextQty < 0}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Apply adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
