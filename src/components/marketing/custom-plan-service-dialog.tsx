"use client";

import { useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  canvasItemFromCustom,
  type PlanCanvasItem,
} from "@/components/marketing/plan-builder-types";
import {
  ENTITLEMENT_KINDS,
  ENTITLEMENT_KIND_LABELS,
} from "@/lib/maintenance-programs";
import type { EntitlementKind } from "@/generated/prisma";
import type { CannedJobSummary } from "@/lib/canned-job-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cannedJobs: CannedJobSummary[];
  onAdd: (item: PlanCanvasItem) => void;
};

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function CustomPlanServiceDialog({
  open,
  onOpenChange,
  cannedJobs = [],
  onAdd,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<EntitlementKind>("COUNTED");
  const [quantity, setQuantity] = useState("1");
  const [intervalDays, setIntervalDays] = useState("180");
  const [cannedJobId, setCannedJobId] = useState<string>("none");

  function reset() {
    setName("");
    setDescription("");
    setKind("COUNTED");
    setQuantity("1");
    setIntervalDays("180");
    setCannedJobId("none");
  }

  function submit() {
    if (!name.trim()) return;
    const item = canvasItemFromCustom({
        label: name.trim(),
        description: description.trim() || undefined,
        kind,
        quantity:
          kind === "COUNTED" || kind === "COUPON" || kind === "ACCESS"
            ? parseInt(quantity, 10) || 1
            : null,
        intervalDays:
          kind === "INTERVAL" || kind === "UNLIMITED"
            ? parseInt(intervalDays, 10) || 90
            : parseInt(intervalDays, 10) || null,
        cannedJobId: cannedJobId !== "none" ? cannedJobId : undefined,
      });
    onAdd(item);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add custom service</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Service name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Premium detail wash"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as EntitlementKind)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITLEMENT_KINDS.filter((k) =>
                    ["COUNTED", "INTERVAL", "EVERY_VISIT", "DISCOUNT", "ACCESS"].includes(k),
                  ).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ENTITLEMENT_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(kind === "COUNTED" || kind === "COUPON" || kind === "ACCESS") && (
              <div className="space-y-1.5">
                <Label>Included visits</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
            {(kind === "INTERVAL" || kind === "UNLIMITED" || kind === "COUNTED") && (
              <div className="space-y-1.5">
                <Label>Interval (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
          </div>
          {cannedJobs.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Link to job template (optional)</Label>
              <Select value={cannedJobId} onValueChange={setCannedJobId}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {cannedJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-brand-navy" onClick={submit} disabled={!name.trim()}>
            Add to plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
