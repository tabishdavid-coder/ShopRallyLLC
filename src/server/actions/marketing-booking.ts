"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { appUrl } from "@/lib/app-url";
import {
  BookingSettingsSchema,
  type BookingSettings,
} from "@/lib/booking-settings";
import { getShopBookingSettings } from "@/server/marketing";
import { gates } from "@/server/permission-gates";

export type MarketingBookingResult = { ok: true } | { ok: false; error: string };

const OnlineBookingPatch = z.object({
  onlineBookingEnabled: z.boolean(),
  bookingSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.")
    .min(2)
    .max(60),
  bookingSettings: BookingSettingsSchema,
});

export type OnlineBookingPatch = z.infer<typeof OnlineBookingPatch>;

/** Full online-booking admin payload for the Marketing page. */
export async function getMarketingOnlineBooking() {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return null;
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      onlineBookingEnabled: true,
      bookingSlug: true,
      code: true,
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
    },
  });
  if (!shop) return null;

  const slug = shop.bookingSlug ?? shop.code.toLowerCase();
  const bookingPath = `/book/${slug}`;
  const bookingUrl = await appUrl(bookingPath);
  const bookingSettings = await getShopBookingSettings(shopId);

  return {
    onlineBookingEnabled: shop.onlineBookingEnabled,
    bookingSlug: shop.bookingSlug,
    code: shop.code,
    bookingUrl,
    embedIframe: `<iframe src="${bookingUrl}" title="Book an appointment" width="100%" height="720" style="border:0;border-radius:8px;" loading="lazy"></iframe>`,
    embedLink: `<a href="${bookingUrl}" target="_blank" rel="noopener noreferrer">Book an appointment</a>`,
    bookingSettings,
  };
}

/** Save enable/slug + services, fields, availability, notifications. */
export async function updateMarketingBookingSettings(
  input: OnlineBookingPatch,
): Promise<MarketingBookingResult> {
  const parsed = OnlineBookingPatch.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  for (const day of Object.values(parsed.data.bookingSettings.availability)) {
    if (day.enabled && day.end <= day.start) {
      return { ok: false, error: "Availability end time must be after start time." };
    }
  }

  const services = parsed.data.bookingSettings.services.filter((s) => s.name.trim());
  if (!services.length) {
    return { ok: false, error: "Add at least one service with a name." };
  }
  parsed.data.bookingSettings.services = services.map((s, i) => ({
    ...s,
    name: s.name.trim(),
    sortOrder: i,
  }));

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const conflict = await prisma.shop.findFirst({
    where: {
      bookingSlug: parsed.data.bookingSlug,
      NOT: { id: shopId },
    },
    select: { id: true },
  });
  if (conflict) {
    return { ok: false, error: "That booking URL is already taken. Choose another slug." };
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      onlineBookingEnabled: parsed.data.onlineBookingEnabled,
      bookingSlug: parsed.data.bookingSlug,
      bookingSettings: parsed.data.bookingSettings satisfies BookingSettings,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/marketing/online-booking");
  revalidatePath("/settings/booking");
  revalidatePath(`/book/${parsed.data.bookingSlug}`);
  return { ok: true };
}
