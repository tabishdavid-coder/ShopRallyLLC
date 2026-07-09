export type LeadTicketFields = {
  subject: string;
  body: string;
  email: string;
};

/** Extract shop name from demo/trial lead subject or body. */
export function parseLeadShopName(ticket: Pick<LeadTicketFields, "subject" | "body">): string | null {
  const fromSubject = ticket.subject.match(/(?:Demo request|Trial signup) — (.+)$/i);
  if (fromSubject?.[1]) return fromSubject[1].trim();

  const fromBody = ticket.body.match(/^Shop:\s*(.+)$/m);
  return fromBody?.[1]?.trim() ?? null;
}

export function leadTypeLabel(subject: string): string {
  if (/demo request/i.test(subject)) return "Demo";
  if (/trial signup/i.test(subject)) return "Trial";
  if (/founding waitlist/i.test(subject)) return "Waitlist";
  return "Lead";
}

export function provisionShopHrefFromLead(ticket: LeadTicketFields): string {
  const shopName = parseLeadShopName(ticket) ?? "";
  const params = new URLSearchParams({ create: "1" });
  if (shopName) params.set("name", shopName);
  params.set("email", ticket.email);
  const phone = ticket.body.match(/^Phone:\s*(.+)$/m)?.[1]?.trim();
  if (phone) params.set("phone", phone);
  return `/platform/shops?${params.toString()}`;
}
