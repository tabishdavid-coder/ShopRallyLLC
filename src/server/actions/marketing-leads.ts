"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { ShopPlan } from "@/generated/prisma";

const DemoRequestInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(160),
  shopName: z.string().trim().min(1, "Shop name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  bayCount: z.string().trim().max(40).optional(),
  currentSoftware: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
});

const TrialSignupInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(160),
  shopName: z.string().trim().min(1, "Shop name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  plan: z.nativeEnum(ShopPlan).optional(),
});

const FoundingWaitlistInput = z.object({
  email: z.string().trim().email("Enter a valid email.").max(160),
  shopName: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  source: z.string().trim().max(80).optional(),
});

export type MarketingLeadResult =
  | { ok: true; referenceId: string }
  | { ok: false; error: string };

function formatLeadBody(fields: Record<string, string | undefined>) {
  return Object.entries(fields)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

async function createMarketingLead(subject: string, body: string, contact: { name: string; email: string }) {
  const ticket = await prisma.supportTicket.create({
    data: {
      shopId: null,
      name: contact.name,
      email: contact.email,
      subject,
      body,
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.info("[marketing-lead]", ticket.id, subject);
  }

  revalidatePath("/platform");
  revalidatePath("/platform/leads");
  revalidatePath("/platform/support");

  return ticket.id;
}

export async function submitDemoRequest(raw: z.infer<typeof DemoRequestInput>): Promise<MarketingLeadResult> {
  const parsed = DemoRequestInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  const d = parsed.data;
  const body = formatLeadBody({
    Shop: d.shopName,
    Phone: d.phone,
    "Bay count": d.bayCount,
    "Current software": d.currentSoftware,
    Message: d.message,
    Source: "getshoprally.com/demo",
  });

  try {
    const id = await createMarketingLead(`Demo request — ${d.shopName}`, body, d);
    return { ok: true, referenceId: id };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again or email support." };
  }
}

export async function submitTrialSignup(raw: z.infer<typeof TrialSignupInput>): Promise<MarketingLeadResult> {
  const parsed = TrialSignupInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  const d = parsed.data;
  const body = formatLeadBody({
    Shop: d.shopName,
    Phone: d.phone,
    Plan: d.plan ?? "STARTER",
    Source: "getshoprally.com/signup",
  });

  try {
    const id = await createMarketingLead(`Trial signup — ${d.shopName}`, body, d);
    return { ok: true, referenceId: id };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again or email support." };
  }
}

export async function submitFoundingWaitlist(
  raw: z.infer<typeof FoundingWaitlistInput>,
): Promise<MarketingLeadResult> {
  const parsed = FoundingWaitlistInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  const d = parsed.data;
  const contactName = d.name?.trim() || d.shopName?.trim() || "Waitlist signup";
  const body = formatLeadBody({
    Shop: d.shopName,
    Source: d.source ? `getshoprally.com/waitlist (${d.source})` : "getshoprally.com/waitlist",
    Type: "Founding shop waitlist",
  });

  try {
    const id = await createMarketingLead(`Founding waitlist — ${d.email}`, body, {
      name: contactName,
      email: d.email,
    });
    return { ok: true, referenceId: id };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again or email support." };
  }
}
