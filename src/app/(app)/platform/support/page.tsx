import { Suspense } from "react";

import { PlatformSupportInbox } from "@/components/platform/platform-support-inbox";
import { listPlatformSupportTickets } from "@/server/platform/support";

export const metadata = { title: "Platform support — ShopRally" };

type SearchParams = Promise<{ status?: string; category?: string; ticket?: string }>;

export default async function PlatformSupportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status === "all" ? "all" : "open";
  const categoryParam = params.category?.trim();
  const category =
    categoryParam === "GENERAL" || categoryParam === "WEBSITE_BUILD" ? categoryParam : "all";
  const ticketId = params.ticket?.trim() ?? "";

  const tickets = await listPlatformSupportTickets({
    status: status === "open" ? "open" : "all",
    category,
    limit: 100,
  });

  return (
    <Suspense fallback={null}>
      <PlatformSupportInbox
        tickets={tickets}
        initialStatus={status}
        initialCategory={category}
        initialTicketId={ticketId}
      />
    </Suspense>
  );
}
