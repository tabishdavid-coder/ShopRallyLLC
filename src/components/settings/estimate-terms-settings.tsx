"use client";

import { useState, useTransition } from "react";
import { Check, Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEstimateTerms } from "@/server/actions/shop-legal";

type EstimateTermsSettingsProps = {
  initialEstimateHtml: string;
  initialInvoiceHtml: string;
  version: string;
  updatedAt: Date | null;
};

export function EstimateTermsSettings({
  initialEstimateHtml,
  initialInvoiceHtml,
  version,
  updatedAt,
}: EstimateTermsSettingsProps) {
  const [estimateHtml, setEstimateHtml] = useState(initialEstimateHtml);
  const [invoiceHtml, setInvoiceHtml] = useState(initialInvoiceHtml);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateEstimateTerms({
        estimateTermsHtml: estimateHtml,
        invoiceTermsHtml: invoiceHtml.trim() ? invoiceHtml : null,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-base font-semibold">Customer Estimate Terms</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Standard authorization language shown to customers on the public approval link,
          estimate print, and repair-order print — above the signature block. HTML is supported
          (headings, lists, emphasis).
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Current version: <span className="font-medium text-foreground">{version}</span>
          {updatedAt
            ? ` · Last updated ${updatedAt.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}`
            : null}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimate-terms">Estimate authorization terms</Label>
        <Textarea
          id="estimate-terms"
          value={estimateHtml}
          onChange={(e) => setEstimateHtml(e.target.value)}
          rows={14}
          className="font-mono text-xs leading-relaxed"
          placeholder="Authorization, payment, and warranty language…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoice-terms">Invoice acknowledgment terms</Label>
        <Textarea
          id="invoice-terms"
          value={invoiceHtml}
          onChange={(e) => setInvoiceHtml(e.target.value)}
          rows={8}
          className="font-mono text-xs leading-relaxed"
          placeholder="Customer acknowledgment shown on invoices…"
        />
        <p className="text-xs text-muted-foreground">
          Shown on the public invoice page and invoice print. Leave blank to use the platform
          default acknowledgment.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? (
          <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3.5" /> Saved
          </span>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <Eye className="size-4" /> Preview
        </Button>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Estimate terms preview</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none rounded-lg border bg-muted/20 p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: estimateHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
