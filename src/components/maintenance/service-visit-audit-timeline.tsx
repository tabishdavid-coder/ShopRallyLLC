"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, Loader2, User, Wrench, Ban } from "lucide-react";

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
import { voidMaintenanceServiceVisit } from "@/server/actions/maintenance-subscriptions";
import type { ServiceVisitAuditEntry } from "@/server/maintenance-service-visits";
import { cn } from "@/lib/utils";
import { defaultRoOpenHref } from "@/lib/ro-workspace";

type Props = {
  visits: ServiceVisitAuditEntry[];
  subscriptionId: string;
  onVoided?: () => void;
};

export function ServiceVisitAuditTimeline({ visits, subscriptionId, onVoided }: Props) {
  const [voidTarget, setVoidTarget] = useState<ServiceVisitAuditEntry | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const completed = visits.filter((v) => v.status === "COMPLETED");
  const voided = visits.filter((v) => v.status === "VOIDED");

  if (!visits.length) {
    return <p className="text-sm text-muted-foreground">No visits recorded yet.</p>;
  }

  function submitVoid() {
    if (!voidTarget) return;
    setError(null);
    start(async () => {
      const res = await voidMaintenanceServiceVisit({
        visitId: voidTarget.id,
        reason,
      });
      if (res.ok) {
        setVoidTarget(null);
        setReason("");
        onVoided?.();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <ul className="space-y-4">
        {[...completed, ...voided].map((visit) => (
          <li
            key={visit.id}
            className={cn(
              "rounded-lg border p-4",
              visit.status === "VOIDED" && "opacity-60 bg-muted/30",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="size-4 text-brand-navy" />
                {new Date(visit.performedAt).toLocaleString()}
                {visit.status === "VOIDED" ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Voided
                  </span>
                ) : null}
              </div>
              {visit.status === "COMPLETED" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setVoidTarget(visit);
                    setReason("");
                    setError(null);
                  }}
                >
                  <Ban className="mr-1 size-3" /> Void
                </Button>
              ) : null}
            </div>

            <ul className="mt-2 space-y-1">
              {visit.services.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Wrench className="size-3.5 text-brand-red" />
                  {s.label}
                  {s.quantity > 1 ? ` ×${s.quantity}` : ""}
                </li>
              ))}
            </ul>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {visit.gatekeeperVerified ? (
                <span className="text-green-700 font-medium">Vehicle verified ✓</span>
              ) : visit.gatekeeperMismatch ? (
                <span className="text-destructive font-medium">Gate mismatch</span>
              ) : null}
              {visit.gatekeeperPlate ? <span>Plate: {visit.gatekeeperPlate}</span> : null}
              {visit.gatekeeperVinLast6 ? <span>VIN …{visit.gatekeeperVinLast6}</span> : null}
              {visit.performedByName ? (
                <span className="flex items-center gap-1">
                  <User className="size-3" /> {visit.performedByName}
                </span>
              ) : null}
              {visit.mileageIn ? <span>{visit.mileageIn.toLocaleString()} mi</span> : null}
              {visit.repairOrder ? (
                <Link
                  href={defaultRoOpenHref(visit.repairOrder.id)}
                  className="text-brand-navy hover:underline"
                >
                  RO #{visit.repairOrder.number}
                </Link>
              ) : null}
            </div>

            {visit.notes ? (
              <p className="mt-2 text-xs italic text-muted-foreground">{visit.notes}</p>
            ) : null}
            {visit.voidReason ? (
              <p className="mt-1 text-xs text-destructive">Void reason: {visit.voidReason}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={!!voidTarget} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void service visit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This restores entitlement counts. The visit record stays in the audit log as voided.
          </p>
          <div>
            <Label className="text-xs">Reason (required)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Recorded in error"
              className="mt-1"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !reason.trim()}
              onClick={submitVoid}
            >
              {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Void visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
