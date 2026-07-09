import type { ApprovalSignatureInfo } from "@/components/repair-order/approval-signature-panel";

type SignatureJson = {
  imageDataUrl?: string;
};

/** Parse stored approval signature fields from a repair order. */
export function parseApprovalSignature(ro: {
  approvedVia: string | null;
  authorizedBy: string | null;
  authorizedAt?: Date | null;
  approvalSignerName: string | null;
  approvalSignedAt: Date | null;
  approvalSignatureJson: unknown;
  estimateTermsVersion?: string | null;
  estimateTermsHash?: string | null;
}): ApprovalSignatureInfo | null {
  const signedAt = ro.approvalSignedAt ?? (ro.approvedVia === "CUSTOMER" ? ro.authorizedAt : null);
  if (!signedAt) return null;

  const json = ro.approvalSignatureJson as SignatureJson | null;

  return {
    signerName: ro.approvalSignerName ?? ro.authorizedBy ?? "Customer",
    signedAt,
    imageDataUrl: json?.imageDataUrl ?? null,
    approvedVia: ro.approvedVia,
    authorizedBy: ro.authorizedBy,
    estimateTermsVersion: ro.estimateTermsVersion,
    estimateTermsHash: ro.estimateTermsHash,
  };
}

/** Shorthand when only signature JSON blob is available. */
export function signatureImageFromJson(json: unknown): string | null {
  const data = json as SignatureJson | null;
  return data?.imageDataUrl ?? null;
}
