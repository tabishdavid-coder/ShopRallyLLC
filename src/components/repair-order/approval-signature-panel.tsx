"use client";

import { useState } from "react";
import { PenLine, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type ApprovalSignatureInfo = {
  signerName: string;
  signedAt: Date | string;
  imageDataUrl: string | null;
  approvedVia: string | null;
  authorizedBy: string | null;
  estimateTermsVersion?: string | null;
  estimateTermsHash?: string | null;
};

function fmtSignedAt(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Shows customer authorization details and signature thumbnail on the RO. */
export function ApprovalSignaturePanel({
  info,
  compact = false,
  className,
}: {
  info: ApprovalSignatureInfo | null;
  compact?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!info?.signedAt && !info?.signerName) return null;

  const viaLabel =
    info.approvedVia === "CUSTOMER"
      ? "Customer link"
      : info.approvedVia === "SHOP"
        ? "Shop approval"
        : "Authorization";

  const signer = info.signerName || info.authorizedBy || "Customer";

  if (compact) {
    return (
      <div className={cn("text-[13px] text-white/80", className)}>
        <div className="font-medium text-white">
          Signed by {signer} on {fmtSignedAt(info.signedAt)}
        </div>
        {info.imageDataUrl ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-brand-light hover:underline"
          >
            <PenLine className="size-3" />
            {expanded ? "Hide signature" : "View signature"}
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        ) : null}
        {expanded && info.imageDataUrl ? (
          <img
            src={info.imageDataUrl}
            alt={`Signature of ${signer}`}
            className="mt-2 max-h-24 rounded border border-white/20 bg-white p-1"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-emerald-900">{viaLabel}</p>
          <p className="mt-0.5 text-emerald-800">
            Signed by <span className="font-medium">{signer}</span> on{" "}
            {fmtSignedAt(info.signedAt)}
          </p>
          {info.estimateTermsVersion ? (
            <p className="mt-1 text-xs text-emerald-700">
              Terms version {info.estimateTermsVersion} at time of signing
              {info.estimateTermsHash ? (
                <>
                  {" "}
                  · ref{" "}
                  <span className="font-mono" title={info.estimateTermsHash}>
                    {info.estimateTermsHash.slice(0, 12)}…
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {info.imageDataUrl ? (
          <img
            src={info.imageDataUrl}
            alt={`Signature of ${signer}`}
            className="max-h-16 rounded border border-emerald-200 bg-white p-1 shadow-sm"
          />
        ) : null}
      </div>
    </div>
  );
}
