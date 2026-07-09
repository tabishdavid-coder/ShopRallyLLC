"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  FileSearch,
  Package,
  ShieldCheck,
  Search,
  Plus,
  Wrench,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import { RoPurchaseOrdersPanel } from "@/components/repair-order/ro-purchase-orders-panel";
import { AddActivityDialog } from "@/components/repair-order/add-activity-dialog";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import type { PurchaseOrderRow } from "@/server/purchase-orders";
import Link from "next/link";
import { deleteRepairOrder } from "@/server/actions/repair-orders";

type SummarySection =
  | "activity"
  | "appointments"
  | "job-history"
  | "inspection-history"
  | "purchase-orders"
  | "auth-history";

const SECTIONS: {
  key: SummarySection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "activity", label: "Activity Feed", icon: Activity },
  { key: "appointments", label: "Appointments", icon: CalendarClock },
  { key: "job-history", label: "Job History", icon: Wrench },
  { key: "inspection-history", label: "Inspection History", icon: FileSearch },
  { key: "purchase-orders", label: "Purchase Orders", icon: Package },
  { key: "auth-history", label: "Auth History", icon: ShieldCheck },
];

type ActivityItem = { text: string; at: Date };

type VehicleJobHistoryRow = {
  roId: string;
  roNumber: number;
  completedAt: Date | null;
  totalCents: number;
  jobNames: string[];
};

type InspectionHistoryRow = {
  id: string;
  name: string;
  status: string;
  completedAt: Date | null;
  itemCount: number;
};

type AuthHistoryRow = {
  method: string;
  authorizer: string;
  totalCents: number;
  at: Date;
};

type RoAppointmentRow = {
  id: string;
  startAt: Date;
  title: string;
  status: string;
  notes: string | null;
  technicianName: string | null;
};

export function RoSummaryDetails({
  activity,
  roNumber,
  roId,
  roDone,
  purchaseOrders,
  vehicleJobHistory = [],
  inspectionHistory = [],
  authHistory = [],
  appointments = [],
  appointmentPrefill,
  defaultAppointmentDurationMins,
  employees,
  initialSection,
  canDelete = false,
}: {
  activity: ActivityItem[];
  roNumber: number;
  roId: string;
  roDone: boolean;
  purchaseOrders: PurchaseOrderRow[];
  vehicleJobHistory?: VehicleJobHistoryRow[];
  inspectionHistory?: InspectionHistoryRow[];
  authHistory?: AuthHistoryRow[];
  appointments?: RoAppointmentRow[];
  appointmentPrefill: {
    customerId: string;
    customerName: string;
    vehicleId: string;
    repairOrderId: string;
  };
  defaultAppointmentDurationMins: number;
  employees: { id: string; name: string }[];
  initialSection?: SummarySection;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SummarySection>(initialSection ?? "activity");
  const [activityQuery, setActivityQuery] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  const filteredActivity = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    if (!q) return activity;
    return activity.filter((a) => a.text.toLowerCase().includes(q));
  }, [activity, activityQuery]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Timeline & records</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Activity, appointments, and history for this repair order.
          </p>
        </div>

        <nav
          className="ro-summary-chip-bar flex flex-wrap gap-2 border-b border-border px-4 py-3"
          aria-label="Timeline sections"
        >
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ro-summary-chip inline-flex items-center gap-1.5",
                  active ? "ro-summary-chip--active" : "ro-summary-chip--idle",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="min-h-[280px] p-4">
            {section === "activity" ? (
              <ActivityPanel
                roId={roId}
                query={activityQuery}
                onQueryChange={setActivityQuery}
                items={filteredActivity}
              />
            ) : null}
            {section === "appointments" ? (
              <AppointmentsPanel
                roNumber={roNumber}
                appointments={appointments}
                defaultDurationMins={defaultAppointmentDurationMins}
                employees={employees}
                prefill={appointmentPrefill}
              />
            ) : null}
            {section === "job-history" ? (
              vehicleJobHistory.length === 0 ? (
                <EmptyPanel icon={Wrench} message="No previous jobs exist for this customer's vehicle." />
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                        <th className="px-3 py-2">RO #</th>
                        <th className="px-3 py-2">Completed</th>
                        <th className="px-3 py-2">Jobs</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleJobHistory.map((h) => (
                        <tr key={h.roId} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <Link href={defaultRoOpenHref(h.roId)} className="font-medium text-brand-navy hover:underline">
                              #{h.roNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-subtle-foreground">
                            {h.completedAt
                              ? new Date(h.completedAt).toLocaleDateString("en-US")
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-subtle-foreground">
                            {h.jobNames.join(", ") || "—"}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{formatCents(h.totalCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
            {section === "inspection-history" ? (
              inspectionHistory.length === 0 ? (
                <EmptyPanel icon={ClipboardList} message="No Inspection History." />
              ) : (
                <ul className="divide-y divide-border">
                  {inspectionHistory.map((ins) => (
                    <li key={ins.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <div>
                        <p className="text-sm font-medium">{ins.name}</p>
                        <p className="text-xs text-subtle-foreground">
                          {ins.status.replace(/_/g, " ")} · {ins.itemCount} items
                        </p>
                      </div>
                      <span className="text-xs text-subtle-foreground">
                        {ins.completedAt
                          ? new Date(ins.completedAt).toLocaleDateString("en-US")
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
            {section === "purchase-orders" ? (
              <RoPurchaseOrdersPanel roId={roId} roDone={roDone} purchaseOrders={purchaseOrders} />
            ) : null}
            {section === "auth-history" ? (
              authHistory.length === 0 ? (
                <AuthHistoryPanel />
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">Authorizer</th>
                        <th className="px-3 py-2">RO Total</th>
                        <th className="px-3 py-2">Authorization Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authHistory.map((a, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">{a.method}</td>
                          <td className="px-3 py-2">{a.authorizer}</td>
                          <td className="px-3 py-2 tabular-nums">{formatCents(a.totalCents)}</td>
                          <td className="px-3 py-2">
                            {new Date(a.at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            disabled={deletePending}
            className="gap-2 text-subtle-foreground hover:text-destructive"
            onClick={() => {
              if (!confirm(`Delete repair order #${roNumber}? This cannot be undone.`)) return;
              setDeleteError(null);
              startDelete(async () => {
                const res = await deleteRepairOrder(roId);
                if (res.ok) router.push("/job-board");
                else setDeleteError(res.error);
              });
            }}
          >
            <Trash2 className="size-4" />
            {deletePending ? "Deleting…" : "Delete Repair Order"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled
            title="Only estimate repair orders without payments can be deleted"
            className="gap-2 text-subtle-foreground opacity-60"
          >
            <Trash2 className="size-4" />
            Delete Repair Order
          </Button>
        )}
        {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      </div>
    </div>
  );
}

function ActivityPanel({
  roId,
  query,
  onQueryChange,
  items,
}: {
  roId: string;
  query: string;
  onQueryChange: (q: string) => void;
  items: ActivityItem[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-foreground/45" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search repair order activity"
            className="h-9 border-border bg-background pl-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 border-brand-navy/25 text-brand-navy hover:bg-brand-light/15"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          Add activity
        </Button>
      </div>

      <AddActivityDialog open={addOpen} onOpenChange={setAddOpen} repairOrderId={roId} />

      <ul className="divide-y divide-border">
        {items.length === 0 ? (
          <li className="py-8 text-center text-sm text-subtle-foreground">No activity found.</li>
        ) : (
          items.map((a, i) => (
            <li key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0">
              <span className="text-sm text-foreground">{a.text}</span>
              <span className="shrink-0 text-xs tabular-nums text-subtle-foreground">
                {new Date(a.at).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function AppointmentsPanel({
  roNumber,
  appointments,
  defaultDurationMins,
  employees,
  prefill,
}: {
  roNumber: number;
  appointments: RoAppointmentRow[];
  defaultDurationMins: number;
  employees: { id: string; name: string }[];
  prefill: {
    customerId: string;
    customerName: string;
    vehicleId: string;
    repairOrderId: string;
  };
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.notes?.toLowerCase().includes(q) ?? false) ||
        a.status.toLowerCase().includes(q),
    );
  }, [appointments, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-foreground/45" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search appointments"
            className="h-9 border-border pl-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          className="h-9 bg-brand-navy text-white hover:bg-brand-navy/90"
          onClick={() => setCreateOpen(true)}
        >
          Create Appointment
        </Button>
      </div>

      <NewAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDurationMins={defaultDurationMins}
        employees={employees}
        defaults={{
          customerId: prefill.customerId,
          customerName: prefill.customerName,
          vehicleId: prefill.vehicleId,
          repairOrderId: prefill.repairOrderId,
          notes: `RO #${roNumber}`,
        }}
      />

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">Title/Notes</th>
              <th className="px-3 py-2">Appointment Status</th>
              <th className="px-3 py-2">Assigned Employee</th>
              <th className="px-3 py-2">Purpose of Visit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-subtle-foreground">
                  No appointments scheduled for RO #{roNumber}.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-3 py-2 tabular-nums">
                    {new Date(a.startAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.title}</div>
                    {a.notes ? <div className="text-xs text-muted-foreground">{a.notes}</div> : null}
                  </td>
                  <td className="px-3 py-2 capitalize">{a.status.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="px-3 py-2">{a.technicianName ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuthHistoryPanel() {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            <th className="px-3 py-2">Method</th>
            <th className="px-3 py-2">Authorizer</th>
            <th className="px-3 py-2">RO Total</th>
            <th className="px-3 py-2">Authorization Date</th>
            <th className="px-3 py-2">IP Address</th>
            <th className="px-3 py-2">View PDF</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="px-3 py-10 text-center text-sm text-subtle-foreground">
              No authorizations have been given.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-subtle-foreground">
      <Icon className="size-10 stroke-[1.25]" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
