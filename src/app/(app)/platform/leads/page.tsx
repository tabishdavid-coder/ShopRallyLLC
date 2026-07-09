import { Suspense } from "react";

import { PlatformLeadsInbox } from "@/components/platform/platform-leads-inbox";
import { listPlatformMarketingLeads } from "@/server/platform/leads";

export const metadata = { title: "Platform leads — ShopRally" };

type SearchParams = Promise<{ status?: string; ticket?: string }>;

export default async function PlatformLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status === "all" ? "all" : "open";
  const ticketId = params.ticket?.trim() ?? "";

  const tickets = await listPlatformMarketingLeads({
    status: status === "open" ? "open" : "all",
    limit: 100,
  });

  return (
    <Suspense fallback={null}>
      <PlatformLeadsInbox tickets={tickets} initialStatus={status} initialTicketId={ticketId} />
    </Suspense>
  );
}
