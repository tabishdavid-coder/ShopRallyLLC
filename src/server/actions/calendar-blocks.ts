"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

const BlockTimeInput = z.object({
  title: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMins: z.number().int().min(15).max(480),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const UpdateBlockInput = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMins: z.number().int().min(15).max(480).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const PAST_START_ERROR =
  "Choose a start time that is today or in the future.";

function buildStartEnd(date: string, startTime: string, durationMins: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMins * 60_000);
  return { startAt, endAt };
}

function sameMinute(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

function rejectPastStart(
  startAt: Date,
  existingStartAt?: Date,
): ActionResult | null {
  if (existingStartAt && sameMinute(startAt, existingStartAt)) return null;
  if (startAt.getTime() < Date.now()) {
    return { ok: false, error: PAST_START_ERROR };
  }
  return null;
}

export async function createCalendarBlock(
  raw: z.infer<typeof BlockTimeInput>,
): Promise<ActionResult> {
  const parsed = BlockTimeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const { startAt, endAt } = buildStartEnd(d.date, d.startTime, d.durationMins);
  const past = rejectPastStart(startAt);
  if (past) return past;

  const block = await prisma.calendarBlock.create({
    data: {
      shopId,
      title: d.title,
      startAt,
      endAt,
      notes: d.notes ?? null,
    },
    select: { id: true },
  });

  revalidatePath("/appointments");
  revalidatePath("/appointments/print");
  return { ok: true, id: block.id };
}

export async function updateCalendarBlock(
  raw: z.infer<typeof UpdateBlockInput>,
): Promise<ActionResult> {
  const parsed = UpdateBlockInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const existing = await prisma.calendarBlock.findFirst({
    where: { id: d.id, shopId },
    select: { id: true, startAt: true, endAt: true },
  });
  if (!existing) return { ok: false, error: "Block not found." };

  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.notes !== undefined) data.notes = d.notes;

  if (d.date && d.startTime && d.durationMins) {
    const { startAt, endAt } = buildStartEnd(d.date, d.startTime, d.durationMins);
    const past = rejectPastStart(startAt, existing.startAt);
    if (past) return past;
    data.startAt = startAt;
    data.endAt = endAt;
  } else if (d.date && d.startTime) {
    const durationMins = Math.round(
      (existing.endAt.getTime() - existing.startAt.getTime()) / 60_000,
    );
    const { startAt, endAt } = buildStartEnd(d.date, d.startTime, durationMins);
    const past = rejectPastStart(startAt, existing.startAt);
    if (past) return past;
    data.startAt = startAt;
    data.endAt = endAt;
  }

  await prisma.calendarBlock.update({ where: { id: d.id }, data });
  revalidatePath("/appointments");
  revalidatePath("/appointments/print");
  return { ok: true, id: d.id };
}

export async function deleteCalendarBlock(id: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const existing = await prisma.calendarBlock.findFirst({
    where: { id, shopId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Block not found." };

  await prisma.calendarBlock.delete({ where: { id } });
  revalidatePath("/appointments");
  revalidatePath("/appointments/print");
  return { ok: true, id };
}
