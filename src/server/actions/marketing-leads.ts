"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { ShopPlan } from "@/generated/prisma";
import {
  confirmMarketingLeadToSubmitter,
  notifyOpsOfMarketingLead,
} from "@/server/services/marketing-lead-notify";

const DemoRequestInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(160),
  shopName: z.string().trim().min(1, "Shop name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  bayCount: z.string().trim().max(40).optional(),
  currentSoftware: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
  /** e.g. Website & SEO companion interest — separate from Ignition CRM. */
  interests: z.string().trim().max(500).optional(),
  /** Query source flag, e.g. need=website → "website". */
  need: z.string().trim().max(80).optional(),
});

const TrialSignupInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(160),
  shopName: z.string().trim().min(1, "Shop name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  plan: z.nativeEnum(ShopPlan).optional(),
  /** Default-on at signup — Ignition + AI Plus bundle interest. */
  wantAiPlus: z.boolean().optional(),
});

const FoundingWaitlistInput = z.object({
  email: z.string().trim().email("Enter a valid email.").max(160),
  shopName: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  source: z.string().trim().max(80).optional(),
  /** Friction picks from easy-start path (comma-joined labels ok). */
  interests: z.string().trim().max(500).optional(),
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

async function createMarketingLead(
  formType: string,
  subject: string,
  body: string,
  contact: { name: string; email: string },
) {
  const ticket = await prisma.supportTicket.create({
    data: {
      shopId: null,
      name: contact.name,
      email: contact.email,
      subject,
      body,
    },
  });

  console.info(`[marketing-lead] ticket=${ticket.id} type=${formType} subject=${subject}`);

  // Ops email is best-effort — never fail the form if Resend is down/missing.
  await notifyOpsOfMarketingLead({
    formType,
    ticketId: ticket.id,
    subject,
    name: contact.name,
    email: contact.email,
    body,
    createdAt: ticket.createdAt,
  });
  await confirmMarketingLeadToSubmitter({
    formType,
    ticketId: ticket.id,
    name: contact.name,
    email: contact.email,
  });

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
  const websiteNeed = d.need === "website" || /website|shopsite|seo/i.test(d.interests ?? "");
  const formType = websiteNeed ? "Website & SEO request" : "Demo request";
  const body = formatLeadBody({
    Shop: d.shopName,
    Phone: d.phone,
    "Bay count": d.bayCount,
    "Current software": d.currentSoftware,
    Interests: d.interests,
    Need: d.need,
    Message: d.message,
    Source: websiteNeed
      ? "getshoprally.com/demo (website+seo)"
      : "getshoprally.com/demo",
  });

  try {
    const subject = websiteNeed
      ? `Website & SEO request — ${d.shopName}`
      : `Demo request — ${d.shopName}`;
    const id = await createMarketingLead(formType, subject, body, d);
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
    "AI Plus": d.wantAiPlus === false ? "No — Ignition only" : "Yes — interested",
    Source: "getshoprally.com/signup",
  });

  try {
    const id = await createMarketingLead(
      "Trial signup",
      `Trial signup — ${d.shopName}`,
      body,
      d,
    );
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
  const websiteInterest = /website|shopsite|seo/i.test(d.interests ?? "") || /website/i.test(d.source ?? "");
  const formType = websiteInterest
    ? "Founding waitlist + Website & SEO"
    : "Founding waitlist";
  const body = formatLeadBody({
    Shop: d.shopName,
    Interests: d.interests,
    Source: d.source ? `getshoprally.com/waitlist (${d.source})` : "getshoprally.com/waitlist",
    Type: websiteInterest
      ? "Founding shop waitlist + Website & SEO interest"
      : "Founding shop waitlist",
  });

  try {
    const subject = websiteInterest
      ? `Founding waitlist + Website & SEO — ${d.email}`
      : `Founding waitlist — ${d.email}`;
    const id = await createMarketingLead(formType, subject, body, {
      name: contactName,
      email: d.email,
    });
    return { ok: true, referenceId: id };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again or email support." };
  }
}
