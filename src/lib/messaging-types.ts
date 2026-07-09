import type { MessageDirection } from "@/generated/prisma";

/** One row in a customer SMS thread (client + server). */
export type MessageRow = {
  id: string;
  direction: MessageDirection;
  body: string;
  status: string | null;
  createdAt: Date;
  repairOrderId: string | null;
};

export type SendResult =
  | { ok: true; mode: "live" | "mock" | "fallback"; messages: MessageRow[]; fallbackUrl?: string }
  | { ok: false; error: string; messages?: MessageRow[] };
