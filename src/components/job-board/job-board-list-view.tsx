"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { JobCardContextActions } from "@/components/job-board/job-card-context-actions";
import { JobBoardHistoryProvider } from "@/components/job-board/job-board-history-provider";
import { JobBoardMessagesProvider } from "@/components/job-board/job-board-messages-provider";
import { RelativeTime } from "@/components/ui/relative-time";
import { customerDisplayName, formatCents } from "@/lib/format";
import type { JobBoardListRow } from "@/lib/job-board-list-utils";
import { JOB_BOARD_STATUS_PILL } from "@/lib/job-board-theme";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import { cn } from "@/lib/utils";

function vehicleLine(row: JobBoardListRow): string {
  const v = row.card.vehicle;
  if (!v) return "—";
  const base = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const plate = v.plate ? ` · ${v.plate}${v.plateState ? ` ${v.plateState}` : ""}` : "";
  return `${base}${plate}`;
}

function listStatusLabel(row: JobBoardListRow): string {
  const card = row.card;
  if (card.paymentPosted) return "Paid";
  if ((card.invoiceBalanceCents ?? 0) > 0) return "Balance due";
  if (card.authorizedAt) return "Approved";
  if (card.approvalSentAt) return "Sent";
  return JOB_BOARD_STATUS_PILL[card.status]?.label ?? row.column.title;
}

export function JobBoardListView({
  rows,
  summary,
  appointmentEmployees = [],
  defaultAppointmentDurationMins = 60,
}: {
  rows: JobBoardListRow[];
  summary: { count: number; totalCents: number };
  appointmentEmployees?: { id: string; name: string }[];
  defaultAppointmentDurationMins?: number;
}) {
  const router = useRouter();

  return (
    <JobBoardHistoryProvider
      appointmentEmployees={appointmentEmployees}
      defaultAppointmentDurationMins={defaultAppointmentDurationMins}
    >
      <JobBoardMessagesProvider>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-3 py-2 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{summary.count}</span> repair orders
              {summary.count > 0 ? (
                <>
                  {" "}
                  · pipeline{" "}
                  <span className="font-semibold tabular-nums text-brand-navy">
                    {formatCents(summary.totalCents)}
                  </span>
                </>
              ) : null}
            </span>
            <span className="hidden sm:inline">Click a row to open · filters apply to this list</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No repair orders match the current filters.
              </div>
            ) : (
              <table className="job-board-list w-full min-w-[920px] border-collapse text-sm">
                <thead className="sticky top-0 z-[1] bg-muted/90 backdrop-blur-sm">
                  <tr className="border-b border-border/70 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">RO #</th>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Age</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const card = row.card;
                    const balanceDue = (card.invoiceBalanceCents ?? 0) > 0 && !card.paymentPosted;
                    return (
                      <tr
                        key={card.id}
                        className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-light/10"
                        onClick={() => router.push(defaultRoOpenHref(card.id))}
                      >
                        <td className="px-3 py-2.5 font-bold tabular-nums text-brand-navy">
                          #{card.number}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                          {row.column.title}
                        </td>
                        <td className="max-w-[12rem] px-3 py-2.5">
                          <Link
                            href={`/customers?customer=${card.customer.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate font-medium text-foreground hover:text-brand-navy hover:underline"
                          >
                            {customerDisplayName(card.customer)}
                          </Link>
                        </td>
                        <td className="max-w-[14rem] truncate px-3 py-2.5 text-xs text-muted-foreground">
                          {vehicleLine(row)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                              balanceDue
                                ? "border-brand-red/35 bg-brand-red/8 text-brand-red"
                                : card.paymentPosted
                                  ? "border-emerald-300/80 bg-emerald-50 text-emerald-800"
                                  : "border-border/70 bg-muted/40 text-muted-foreground",
                            )}
                          >
                            {listStatusLabel(row)}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2.5 text-right font-semibold tabular-nums",
                            balanceDue ? "text-brand-red" : "text-brand-navy",
                          )}
                        >
                          {formatCents(card.totalCents)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          <RelativeTime date={card.createdAt} />
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end">
                            <JobCardContextActions
                              roId={card.id}
                              roNumber={card.number}
                              customerId={card.customer.id}
                              customerName={customerDisplayName(card.customer)}
                              customerFirstName={card.customer.firstName}
                              customerLastName={card.customer.lastName}
                              customerPhone={card.customer.phone}
                              marketingOptIn={card.customer.marketingOptIn}
                              vehicleId={card.vehicle?.id ?? null}
                              vehicleLabel={vehicleLine(row)}
                              vehicle={card.vehicle}
                              iconOnly
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </JobBoardMessagesProvider>
    </JobBoardHistoryProvider>
  );
}
