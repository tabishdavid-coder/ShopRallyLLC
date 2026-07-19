"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Car,
  Loader2,
  Package,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { useSmartRoIntakeEnabled } from "@/lib/shop-capabilities";
import type { ShopNotesAiProposal, ShopNotesProposalItem } from "@/lib/shop-notes-ai-types";
import {
  applyShopNotesProposals,
  parseShopNotesWithAi,
} from "@/server/actions/shop-notes-ai";
import { cn } from "@/lib/utils";

type Props = {
  roId: string;
  notesText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const KIND_GROUPS: {
  title: string;
  kinds: ShopNotesProposalItem["kind"][];
  icon: typeof User;
}[] = [
  { title: "Customer", kinds: ["customer_phone", "customer_email", "customer_name"], icon: User },
  {
    title: "Vehicle",
    kinds: ["vehicle_year", "vehicle_make", "vehicle_model", "vehicle_trim"],
    icon: Car,
  },
  { title: "Concerns", kinds: ["concern"], icon: Wrench },
  { title: "Jobs & parts", kinds: ["job", "part"], icon: Package },
];

function modeBadge(item: ShopNotesProposalItem) {
  if (item.mode === "update" && item.targetJobId) {
    return (
      <Badge variant="outline" className="border-brand-navy/40 bg-brand-navy/5 text-[10px] text-brand-navy">
        Update existing
      </Badge>
    );
  }
  if (item.mode === "update") {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-900">
        Replace existing
      </Badge>
    );
  }
  if (item.mode === "fill") {
    return (
      <Badge variant="outline" className="border-brand-light/60 bg-brand-light/10 text-[10px] text-brand-navy">
        Fill empty
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-900">
      Add new
    </Badge>
  );
}

export function ShopNotesAiSheet({ roId, notesText, open, onOpenChange }: Props) {
  const router = useRouter();
  const entitled = useSmartRoIntakeEnabled();
  const { toast } = useEstimateActionToast();
  const [proposal, setProposal] = useState<ShopNotesAiProposal | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setProposal(null);
      setAccepted({});
      setError(null);
      return;
    }
    if (!entitled || notesText.trim().length < 8) return;

    startTransition(async () => {
      const res = await parseShopNotesWithAi({ roId, text: notesText });
      if (!res.ok) {
        setError(res.error);
        setProposal(null);
        return;
      }
      setProposal(res.proposal);
      setAccepted(
        Object.fromEntries(res.proposal.items.map((item) => [item.id, item.defaultAccepted])),
      );
      setError(null);
    });
  }, [open, roId, notesText, entitled]);

  const selectedCount = useMemo(
    () => (proposal?.items.filter((item) => accepted[item.id]).length ?? 0),
    [proposal, accepted],
  );

  function toggleAll(next: boolean) {
    if (!proposal) return;
    setAccepted(Object.fromEntries(proposal.items.map((item) => [item.id, next])));
  }

  function applySelected() {
    if (!proposal) return;
    const items = proposal.items
      .filter((item) => accepted[item.id])
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        proposedValue: item.proposedValue,
        job: item.job,
        part: item.part,
      }));
    if (items.length === 0) {
      setError("Select at least one change to apply.");
      return;
    }

    startTransition(async () => {
      const res = await applyShopNotesProposals({ roId, items });
      if (!res.ok) {
        setError(res.error);
        toast("error", res.error);
        return;
      }
      toast(
        "success",
        res.skipped > 0
          ? `Applied ${res.applied} change${res.applied === 1 ? "" : "s"} (${res.skipped} skipped).`
          : `Applied ${res.applied} change${res.applied === 1 ? "" : "s"}.`,
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 pr-12">
          <SheetTitle className="flex items-center gap-2 text-brand-navy">
            <Sparkles className="size-4 text-brand-red" aria-hidden />
            Apply shop notes
          </SheetTitle>
          <SheetDescription>
            AI reads your internal note and suggests structured updates. Nothing changes until you
            apply.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!entitled ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
              Smart AI intake is not enabled for this shop. Contact your platform admin to turn on
              the AI Plus add-on.
            </div>
          ) : null}

          {pending && !proposal ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-brand-navy" aria-hidden />
              Parsing note…
            </div>
          ) : null}

          {error ? (
            <div className="mb-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}

          {proposal ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-brand-navy/20 bg-brand-navy/[0.03] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Source note
                </p>
                <p className="mt-1 line-clamp-4 text-sm leading-snug text-foreground/90">
                  {proposal.sourceText}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {proposal.items.length} suggestion{proposal.items.length === 1 ? "" : "s"}
                </p>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(true)}>
                    All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(false)}>
                    None
                  </Button>
                </div>
              </div>

              {KIND_GROUPS.map((group) => {
                const items = proposal.items.filter((item) => group.kinds.includes(item.kind));
                if (items.length === 0) return null;
                const Icon = group.icon;
                return (
                  <section key={group.title} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy">
                      <Icon className="size-3.5" aria-hidden />
                      {group.title}
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <ProposalRow
                          key={item.id}
                          item={item}
                          checked={Boolean(accepted[item.id])}
                          onCheckedChange={(checked) =>
                            setAccepted((prev) => ({ ...prev, [item.id]: checked }))
                          }
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-brand-navy hover:bg-brand-navy/90"
            disabled={!proposal || pending || selectedCount === 0}
            onClick={applySelected}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Applying…
              </>
            ) : (
              <>Apply selected ({selectedCount})</>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ProposalRow({
  item,
  checked,
  onCheckedChange,
}: {
  item: ShopNotesProposalItem;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        checked ? "border-brand-navy/30 bg-brand-navy/[0.04]" : "border-border bg-card hover:bg-muted/30",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          {modeBadge(item)}
        </div>
        {item.currentValue ? (
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className="line-through opacity-70">{item.currentValue}</span>
            <ArrowRight className="size-3 shrink-0" aria-hidden />
            <span className="font-medium text-foreground">{item.proposedValue}</span>
          </p>
        ) : (
          <p className="text-sm text-foreground">{item.proposedValue}</p>
        )}
        {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
      </div>
    </label>
  );
}
