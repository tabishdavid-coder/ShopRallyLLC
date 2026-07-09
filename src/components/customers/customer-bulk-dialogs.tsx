"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
import { LEAD_SOURCES } from "@/lib/options";
import { bulkTagCustomers, bulkUpdateCustomers } from "@/server/actions/customers";

export function CustomerTagDialog({
  open,
  onOpenChange,
  customerIds,
  availableTags,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerIds: string[];
  availableTags: string[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const trimmed = tag.trim();
    if (!trimmed) {
      setError("Enter or choose a tag.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await bulkTagCustomers({ customerIds, tag: trimmed });
      if (res.ok) {
        onOpenChange(false);
        setTag("");
        onSuccess?.();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tag customers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Add a tag to {customerIds.length} selected customer{customerIds.length === 1 ? "" : "s"}.
          </p>
          {availableTags.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Existing tags</Label>
              <Select value={tag || undefined} onValueChange={setTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tag…" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="new-tag">Or enter a new tag</Label>
            <Input
              id="new-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. Fleet, VIP"
              maxLength={40}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="bg-brand-navy hover:bg-brand-navy/90">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerBulkEditDialog({
  open,
  onOpenChange,
  customerIds,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerIds: string[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [marketingChoice, setMarketingChoice] = useState<"unchanged" | "yes" | "no">("unchanged");
  const [leadSourceChoice, setLeadSourceChoice] = useState<string>("__unchanged__");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const payload: {
      customerIds: string[];
      marketingOptIn?: boolean;
      leadSource?: string | null;
    } = { customerIds };

    if (marketingChoice !== "unchanged") {
      payload.marketingOptIn = marketingChoice === "yes";
    }
    if (leadSourceChoice !== "__unchanged__") {
      payload.leadSource = leadSourceChoice === "__clear__" ? null : leadSourceChoice;
    }

    if (marketingChoice === "unchanged" && leadSourceChoice === "__unchanged__") {
      setError("Choose at least one field to update.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await bulkUpdateCustomers(payload);
      if (res.ok) {
        onOpenChange(false);
        setMarketingChoice("unchanged");
        setLeadSourceChoice("__unchanged__");
        onSuccess?.();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk edit ({customerIds.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Marketing opt-in</Label>
            <Select value={marketingChoice} onValueChange={(v) => setMarketingChoice(v as typeof marketingChoice)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Leave unchanged</SelectItem>
                <SelectItem value="yes">Opt in</SelectItem>
                <SelectItem value="no">Opt out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lead source</Label>
            <Select value={leadSourceChoice} onValueChange={setLeadSourceChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Leave unchanged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unchanged__">Leave unchanged</SelectItem>
                <SelectItem value="__clear__">Clear lead source</SelectItem>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="bg-brand-navy hover:bg-brand-navy/90">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
