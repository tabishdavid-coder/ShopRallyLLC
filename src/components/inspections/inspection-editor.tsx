"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  groupInspectionItems,
  INSPECTION_ITEM_STATUS,
  INSPECTION_STATUS,
  INSPECTION_STATUS_DOT,
  inspectionProgress,
} from "@/lib/inspection";
import { InspectionWorkflowBadge } from "@/components/inspections/inspection-badges";
import { InspectionStatusToggle } from "@/components/inspections/inspection-status-toggle";
import { ShareInspectionDialog } from "@/components/inspections/share-inspection-dialog";
import { AddInspectionDialog } from "@/components/inspections/add-inspection-dialog";
import {
  completeInspection,
  updateInspectionItem,
} from "@/server/actions/inspections";
import type { InspectionDetail } from "@/server/inspections";
import type { InspectionItemStatus, InspectionStatus } from "@/generated/prisma";

type ItemState = {
  id: string;
  name: string;
  category: string | null;
  status: InspectionItemStatus;
  note: string | null;
  sortOrder: number;
};

export function InspectionEditor({
  roId,
  roNumber,
  customerFirstName,
  shopName,
  phones,
  email,
  inspections,
}: {
  roId: string;
  roNumber: number;
  customerFirstName: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
  inspections: InspectionDetail[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(inspections[0]?.id ?? "");
  const [items, setItems] = useState<ItemState[]>(() =>
    inspections[0]?.items.map((i) => ({ ...i })) ?? [],
  );
  const [status, setStatus] = useState<InspectionStatus>(
    inspections[0]?.status ?? INSPECTION_STATUS.NOT_STARTED,
  );
  const [progress, setProgress] = useState(inspections[0]?.progress);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, startComplete] = useTransition();
  const [pending, startSave] = useTransition();

  const syncFromInspection = useCallback((insp: InspectionDetail) => {
    setActiveId(insp.id);
    setItems(insp.items.map((i) => ({ ...i })));
    setStatus(insp.status);
    setProgress(insp.progress);
    setError(null);
  }, []);

  useEffect(() => {
    if (inspections.length === 0) return;
    const current = inspections.find((i) => i.id === activeId);
    if (!current) {
      syncFromInspection(inspections[inspections.length - 1]);
    } else {
      setItems(current.items.map((i) => ({ ...i })));
      setStatus(current.status);
      setProgress(current.progress);
    }
  }, [inspections, activeId, syncFromInspection]);

  function addInspection() {
    setAddOpen(true);
  }

  const existingTemplateNames = inspections.map((i) => i.templateName);
  const activeInspection = inspections.find((i) => i.id === activeId) ?? inspections[0];

  function saveItem(itemId: string, patch: { status?: InspectionItemStatus; note?: string }) {
    if (!activeId) return;
    setError(null);

    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              ...patch,
              note: patch.note !== undefined ? patch.note || null : i.note,
            }
          : i,
      );
      setProgress(inspectionProgress(next));
      return next;
    });

    startSave(async () => {
      const res = await updateInspectionItem({
        inspectionId: activeId,
        itemId,
        ...patch,
      });
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  function markComplete() {
    if (!activeId) return;
    setError(null);
    startComplete(async () => {
      const res = await completeInspection(activeId);
      if (res.ok) {
        setStatus(INSPECTION_STATUS.COMPLETED);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (inspections.length === 0) {
    return (
      <>
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <ClipboardList className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            Diagnose vehicle issues with a digital multi-point inspection checklist.
          </p>
          <Button
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={addInspection}
          >
            Add New Inspection
          </Button>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <AddInspectionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          roId={roId}
          existingTemplateNames={[]}
        />
      </>
    );
  }

  const groups = groupInspectionItems(items);
  const canComplete =
    status !== INSPECTION_STATUS.COMPLETED &&
    items.length > 0 &&
    items.every((i) => i.status !== INSPECTION_ITEM_STATUS.NA);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {inspections.length > 1 ? (
            <Select value={activeId} onValueChange={(id) => {
              const insp = inspections.find((i) => i.id === id);
              if (insp) syncFromInspection(insp);
            }}>
              <SelectTrigger className="h-9 w-[min(100%,320px)]">
                <SelectValue placeholder="Select inspection" />
              </SelectTrigger>
              <SelectContent>
                {inspections.map((insp) => (
                  <SelectItem key={insp.id} value={insp.id}>
                    {insp.templateName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h2 className="text-sm font-semibold">{activeInspection?.templateName}</h2>
          )}
          <InspectionWorkflowBadge status={status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addInspection}>
            Add Inspection
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="size-4" />
            Share
          </Button>
          {canComplete ? (
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={markComplete}
              disabled={completing}
            >
              {completing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Mark complete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{progress?.rated ?? 0}</span> of{" "}
              {progress?.total ?? 0} rated
            </span>
            {progress && progress.counts.RED > 0 ? (
              <span className="flex items-center gap-1">
                <span className={cn("size-2 rounded-full", INSPECTION_STATUS_DOT.RED)} />
                {progress.counts.RED} fail
              </span>
            ) : null}
            {progress && progress.counts.YELLOW > 0 ? (
              <span className="flex items-center gap-1">
                <span className={cn("size-2 rounded-full", INSPECTION_STATUS_DOT.YELLOW)} />
                {progress.counts.YELLOW} monitor
              </span>
            ) : null}
            {progress && progress.counts.GREEN > 0 ? (
              <span className="flex items-center gap-1">
                <span className={cn("size-2 rounded-full", INSPECTION_STATUS_DOT.GREEN)} />
                {progress.counts.GREEN} pass
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="h-2 flex-1 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums">{progress?.percent ?? 0}%</span>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : null}
      {pending ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      ) : null}

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.category} className="rounded-lg border bg-card">
            <header className="border-b px-3 py-2 text-sm font-semibold">{group.category}</header>
            <ul className="divide-y">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={cn("size-2.5 shrink-0 rounded-full", INSPECTION_STATUS_DOT[item.status])}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <InspectionStatusToggle
                      value={item.status}
                      onChange={(s) => saveItem(item.id, { status: s })}
                      compact
                    />
                    <Input
                      placeholder="Notes"
                      value={item.note ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, note: e.target.value } : i,
                          ),
                        )
                      }
                      onBlur={(e) => {
                        const note = e.target.value;
                        if (note !== (item.note ?? "")) saveItem(item.id, { note });
                      }}
                      className="h-8 text-sm sm:w-48"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Photo upload per item is coming soon.{" "}
        <Link href="/inspections" className="text-primary hover:underline">
          View all shop inspections
        </Link>
      </p>

      {activeId ? (
        <ShareInspectionDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          inspectionId={activeId}
          roNumber={roNumber}
          customerFirstName={customerFirstName}
          shopName={shopName}
          phones={phones}
          email={email}
        />
      ) : null}

      <AddInspectionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        roId={roId}
        existingTemplateNames={existingTemplateNames}
      />
    </div>
  );
}
