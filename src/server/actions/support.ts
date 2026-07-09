"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { getCurrentUser } from "@/lib/platform";
import {
  buildFaqContext,
  listFaqArticles,
  searchFaqs,
} from "@/server/support";
import { askSupportAi, isSupportAiEnabled } from "@/server/services/support-ai";
import { gates } from "@/server/permission-gates";

const CreateTicketInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(10).max(5000),
});

export type ActionResult =
  | { ok: true; ticketId?: string }
  | { ok: false; error: string };

export async function createSupportTicket(
  raw: z.infer<typeof CreateTicketInput>,
): Promise<ActionResult> {
  const parsed = CreateTicketInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }

  let shopId: string | null = null;
  try {
    shopId = await getShopId();
    const denied = await gates.jobBoardView(shopId);
    if (denied) return denied;
  } catch {
    shopId = null;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      shopId,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  });

  // Email stub — log in dev; wire Resend when support inbox is ready.
  if (process.env.NODE_ENV === "development") {
    console.info("[support-ticket]", ticket.id, parsed.data.subject);
  }

  revalidatePath("/support");
  return { ok: true, ticketId: ticket.id };
}

export type AskFaqResult =
  | {
      ok: true;
      answer: string;
      source: "ai" | "keyword";
      matches: { slug: string; question: string }[];
    }
  | { ok: false; error: string };

export async function askFaqQuestion(question: string): Promise<AskFaqResult> {
  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return denied;

  const q = question.trim();
  if (q.length < 3) {
    return { ok: false, error: "Enter a longer question." };
  }

  const articles = await listFaqArticles();

  if (isSupportAiEnabled()) {
    try {
      const context = buildFaqContext(articles);
      const result = await askSupportAi(q, context);
      return {
        ok: true,
        answer: result.answer,
        source: "ai",
        matches: [],
      };
    } catch {
      // fall through to keyword search
    }
  }

  const matches = searchFaqs(articles, q);
  if (matches.length === 0) {
    return {
      ok: true,
      answer:
        "I couldn't find a matching article. Try different keywords or contact support — " +
        "we're happy to help.",
      source: "keyword",
      matches: [],
    };
  }

  const top = matches[0]!;
  const answer =
    matches.length === 1
      ? top.answer
      : `${top.answer}\n\nRelated: ${matches
          .slice(1, 3)
          .map((m) => m.question)
          .join("; ")}`;

  return {
    ok: true,
    answer,
    source: "keyword",
    matches: matches.slice(0, 3).map((m) => ({ slug: m.slug, question: m.question })),
  };
}

/** Prefill contact form from current user + shop context. */
export async function getSupportFormDefaults(): Promise<{
  name: string;
  email: string;
}> {
  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) throw new Error(denied.error);
  const user = await getCurrentUser();
  const name =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Shop User";
  return { name, email: user.email };
}
