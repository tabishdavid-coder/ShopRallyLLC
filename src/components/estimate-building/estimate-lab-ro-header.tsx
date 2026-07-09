"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { updateRepairOrderSidebar } from "@/server/actions/repair-orders";

type Props = {
  roId: string;
  canEdit: boolean;
  shopNotes: string | null;
  customerRecommendations: string | null;
};

export function EstimateLabRoHeader({
  roId,
  canEdit,
  shopNotes,
  customerRecommendations,
}: Props) {
  const [internalNotes, setInternalNotes] = useState(shopNotes ?? "");
  const [recommendations, setRecommendations] = useState(customerRecommendations ?? "");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startSave] = useTransition();

  useEffect(() => {
    setInternalNotes(shopNotes ?? "");
    setRecommendations(customerRecommendations ?? "");
    setDirty(false);
  }, [shopNotes, customerRecommendations]);

  function save() {
    if (!canEdit || !dirty) return;
    startSave(async () => {
      const res = await updateRepairOrderSidebar({
        roId,
        notes: internalNotes.trim() || null,
        customerRecommendations: recommendations.trim() || null,
      });
      if (res.ok) {
        setDirty(false);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="shrink-0 border-b border-border bg-white px-3 py-2">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-0.5 flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-crm-label">
              Shop notes
            </span>
            <span className="truncate text-[10px] text-muted-foreground" title="Internal — not shown on customer estimate">
              Internal only
            </span>
          </span>
          <div className="relative">
            <Textarea
              value={internalNotes}
              onChange={(e) => {
                setInternalNotes(e.target.value);
                setDirty(true);
                setError(null);
              }}
              onBlur={save}
              disabled={!canEdit || pending}
              placeholder="Technician or advisor notes…"
              rows={1}
              className="min-h-9 max-h-28 resize-y py-1.5 text-sm leading-snug"
            />
            {pending ? (
              <Loader2 className="absolute right-2 top-1.5 size-3 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </div>
        </label>
        <label className="block min-w-0">
          <span className="mb-0.5 flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-crm-label">
              Recommendations
            </span>
            <span className="truncate text-[10px] text-muted-foreground" title="Printed and shared with the estimate">
              On customer estimate
            </span>
          </span>
          <Textarea
            value={recommendations}
            onChange={(e) => {
              setRecommendations(e.target.value);
              setDirty(true);
              setError(null);
            }}
            onBlur={save}
            disabled={!canEdit || pending}
            placeholder="Suggested maintenance or next steps…"
            rows={1}
            className="min-h-9 max-h-28 resize-y py-1.5 text-sm leading-snug"
          />
        </label>
      </div>
      {error ? <p className="mt-1 text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
