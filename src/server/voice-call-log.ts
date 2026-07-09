import "server-only";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";

export type VoiceCallLogRow = {
  id: string;
  callSid: string;
  fromPhone: string;
  toPhone: string;
  status: string;
  durationSeconds: number | null;
  recordingUrl: string | null;
  summary: string | null;
  customerId: string | null;
  appointmentId: string | null;
  consentGiven: boolean;
  createdAt: Date;
};

export async function listVoiceCallLogs(
  shopId: string,
  limit = 40,
): Promise<VoiceCallLogRow[]> {
  const rows = await prisma.voiceCallLog.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      callSid: true,
      fromPhone: true,
      toPhone: true,
      status: true,
      durationSeconds: true,
      recordingUrl: true,
      summary: true,
      customerId: true,
      appointmentId: true,
      consentGiven: true,
      createdAt: true,
    },
  });
  return rows;
}

export async function listShopVoiceCallLogs(limit = 40): Promise<VoiceCallLogRow[]> {
  const shopId = await getShopId();
  return listVoiceCallLogs(shopId, limit);
}
