"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { SupportTicketStatus } from "@/generated/prisma";
import { isPlatformAdmin } from "@/lib/platform";

export type PlatformSupportActionResult = { ok: true } | { ok: false; error: string };

const UpdateStatusInput = z.object({
  ticketId: z.string().min(1),
  status: z.nativeEnum(SupportTicketStatus),
});

async function requirePlatformAdmin(): Promise<PlatformSupportActionResult | null> {
  if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }
  return null;
}

export async function updatePlatformSupportTicketStatus(
  raw: z.infer<typeof UpdateStatusInput>,
): Promise<PlatformSupportActionResult> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const parsed = UpdateStatusInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid ticket update." };
  }

  const exists = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    select: { id: true },
  });
  if (!exists) {
    return { ok: false, error: "Ticket not found." };
  }

  await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data: { status: parsed.data.status },
  });

  revalidatePath("/platform");
  revalidatePath("/platform/support");
  revalidatePath("/platform/leads");
  return { ok: true };
}
