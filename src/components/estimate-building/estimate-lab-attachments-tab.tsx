"use client";

import { Paperclip } from "lucide-react";

export function EstimateLabAttachmentsTab() {
  return (
    <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center p-8 text-center">
      <Paperclip className="size-10 text-muted-foreground/50" aria-hidden />
      <h3 className="mt-3 text-sm font-semibold text-brand-navy">Attachments</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Photos, PDFs, and inspection media will attach here. Cloud upload is planned for a later
        milestone.
      </p>
    </div>
  );
}
