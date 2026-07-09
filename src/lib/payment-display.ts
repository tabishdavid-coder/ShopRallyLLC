import type { PaymentMethod } from "@/generated/prisma";

export type PaymentRow = {
  id: string;
  method: PaymentMethod | string;
  amountCents: number;
  paidAt: string;
  reference: string | null;
  stripePaymentIntentId: string | null;
  customerName: string;
  repairOrderId?: string;
  roNumber?: number;
  status?: "succeeded" | "failed" | "declined";
};

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "CARD":
      return "Credit Card";
    case "CASH":
      return "Cash Payment";
    case "CHECK":
      return "Check Payment";
    case "OTHER":
      return "Other";
    default:
      return method;
  }
}

/** Compact label for job board / list chips. */
export function paymentMethodShortLabel(method: string): string {
  switch (method) {
    case "CARD":
      return "Card";
    case "CASH":
      return "Cash";
    case "CHECK":
      return "Check";
    case "OTHER":
      return "Other";
    default:
      return method;
  }
}

export function paymentMethodSubLabel(row: PaymentRow): string {
  if (row.method === "CARD") {
    return row.stripePaymentIntentId ? "Card Not Present" : "Card Present";
  }
  if (row.method === "CASH") return "Cash";
  if (row.method === "CHECK") return "Check";
  return "Other";
}

/** Parse card brand + last4 from references like "Visa ••4242" or "Visa ****3536". */
export function parseCardReference(reference: string | null): {
  brand: string | null;
  last4: string | null;
  authCode: string | null;
} {
  if (!reference) return { brand: null, last4: null, authCode: null };

  const authMatch = reference.match(/Auth:\s*(\S+)/i);
  const authCode = authMatch?.[1] ?? null;

  const cardMatch = reference.match(/^([A-Za-z]+)\s*[•*]{2,4}(\d{4})/);
  if (cardMatch) {
    return { brand: cardMatch[1], last4: cardMatch[2], authCode };
  }

  const last4Match = reference.match(/[•*]{2,4}(\d{4})/);
  return {
    brand: null,
    last4: last4Match?.[1] ?? null,
    authCode,
  };
}

export function paymentInfoText(row: PaymentRow): string {
  if (row.method === "CARD") {
    const { brand, last4, authCode } = parseCardReference(row.reference);
    const parts: string[] = [];
    if (brand && last4) parts.push(`${brand} ****${last4}`);
    else if (last4) parts.push(`****${last4}`);
    else if (row.reference && !authCode) parts.push(row.reference);

    const auth =
      authCode ??
      (row.stripePaymentIntentId ? row.stripePaymentIntentId.slice(-6) : null);
    if (auth) parts.push(`Auth: ${auth}`);
    return parts.join(", ") || "—";
  }

  if (row.method === "CHECK" && row.reference) return row.reference;
  if (row.reference) return row.reference;
  return "—";
}
