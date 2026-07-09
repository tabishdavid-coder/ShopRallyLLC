"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SUPPORT_TICKET_CATEGORY,
  SUPPORT_TICKET_CATEGORY_LABEL,
  SUPPORT_TICKET_STATUS,
} from "@/lib/platform-types";
import { updatePlatformSupportTicketStatus } from "@/server/actions/platform-support";
import type { PlatformSupportTicketRow } from "@/server/platform/support";
import type { SupportTicketCategory, SupportTicketStatus } from "@/generated/prisma";

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function PlatformSupportInbox({
  tickets,
  initialStatus = "open",
  initialCategory = "all",
  initialTicketId = "",
}: {
  tickets: PlatformSupportTicketRow[];
  initialStatus?: "open" | "all";
  initialCategory?: SupportTicketCategory | "all";
  initialTicketId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<SupportTicketCategory | "all">(initialCategory);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTicketId || tickets[0]?.id || null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    let rows = tickets;
    if (statusFilter === "open") {
      rows = rows.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
    }
    if (categoryFilter !== "all") {
      rows = rows.filter((t) => t.category === categoryFilter);
    }
    return rows;
  }, [tickets, statusFilter, categoryFilter]);

  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  function syncUrl(next: {
    status?: "open" | "all";
    category?: SupportTicketCategory | "all";
    ticketId?: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const status = next.status ?? statusFilter;
    const category = next.category ?? categoryFilter;
    const ticketId = next.ticketId === undefined ? selectedId : next.ticketId;

    if (status === "open") params.delete("status");
    else params.set("status", status);

    if (category === "all") params.delete("category");
    else params.set("category", category);

    if (ticketId) params.set("ticket", ticketId);
    else params.delete("ticket");

    const qs = params.toString();
    router.replace(qs ? `/platform/support?${qs}` : "/platform/support");
  }

  function updateStatus(status: SupportTicketStatus) {
    if (!selected) return;
    setError(null);
    start(async () => {
      const res = await updatePlatformSupportTicketStatus({ ticketId: selected.id, status });
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <PlatformPageIntro
        title="Support inbox"
        description={
          <>
            Shop support, website builds, and escalations. Marketing-only leads live on{" "}
            <Link href="/platform/leads" className="font-medium text-brand-navy hover:underline">
              Leads
            </Link>
            .
          </>
        }
      >
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            const next = v as SupportTicketCategory | "all";
            setCategoryFilter(next);
            syncUrl({ category: next });
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value={SUPPORT_TICKET_CATEGORY.GENERAL}>General</SelectItem>
            <SelectItem value={SUPPORT_TICKET_CATEGORY.WEBSITE_BUILD}>Website build</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            const next = v as "open" | "all";
            setStatusFilter(next);
            syncUrl({ status: next });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open only</SelectItem>
            <SelectItem value="all">All tickets</SelectItem>
          </SelectContent>
        </Select>
      </PlatformPageIntro>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ul className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {filtered.map((ticket) => (
            <li key={ticket.id} className="border-b last:border-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(ticket.id);
                  syncUrl({ ticketId: ticket.id });
                }}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors hover:bg-muted/40",
                  selected?.id === ticket.id && "bg-brand-light/15",
                )}
              >
                <p className="truncate text-sm font-medium text-brand-navy">{ticket.subject}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {ticket.name} · {ticket.shopName ?? "Marketing lead"} · {fmtDateTime(ticket.createdAt)}
                </p>
                <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {STATUS_LABEL[ticket.status]}
                </span>
                <span className="ml-1.5 inline-flex rounded-full bg-brand-light/30 px-2 py-0.5 text-[10px] font-medium text-brand-navy">
                  {SUPPORT_TICKET_CATEGORY_LABEL[ticket.category]}
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">No tickets in this view.</li>
          ) : null}
        </ul>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-brand-navy">{selected.subject}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.name} ·{" "}
                  <a href={`mailto:${selected.email}`} className="text-brand-navy hover:underline">
                    {selected.email}
                  </a>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.shopName ? (
                    <>
                      Shop:{" "}
                      <Link
                        href={`/platform/shops/${selected.shopId}`}
                        className="text-brand-navy hover:underline"
                      >
                        {selected.shopName}
                      </Link>
                    </>
                  ) : (
                    <>
                      Marketing lead ·{" "}
                      <Link href={`/platform/leads?ticket=${selected.id}`} className="text-brand-navy hover:underline">
                        View in Leads
                      </Link>
                    </>
                  )}{" "}
                  · {SUPPORT_TICKET_CATEGORY_LABEL[selected.category]} · {fmtDateTime(selected.createdAt)}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto py-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{selected.body}</pre>
              </div>
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {selected.shopId ? (
                  <EnterShopCrmButton
                    shopId={selected.shopId}
                    shopName={selected.shopName ?? undefined}
                    size="sm"
                    className="bg-brand-navy"
                  >
                    Open shop CRM
                  </EnterShopCrmButton>
                ) : null}
                {selected.category === SUPPORT_TICKET_CATEGORY.WEBSITE_BUILD && selected.shopId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/platform/websites/${selected.shopId}`}>Website pipeline</Link>
                  </Button>
                ) : null}
                {(
                  [
                    SUPPORT_TICKET_STATUS.IN_PROGRESS,
                    SUPPORT_TICKET_STATUS.RESOLVED,
                    SUPPORT_TICKET_STATUS.CLOSED,
                  ] as SupportTicketStatus[]
                ).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={selected.status === status ? "default" : "outline"}
                    disabled={pending}
                    className={selected.status === status ? "bg-brand-navy" : ""}
                    onClick={() => updateStatus(status)}
                  >
                    {pending ? <Loader2 className="size-3.5 animate-spin" /> : STATUS_LABEL[status]}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a ticket to read and update status.</p>
          )}
        </div>
      </div>
    </div>
  );
}
