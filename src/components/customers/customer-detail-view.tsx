"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronRight,
  Car,
  CreditCard,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Shield,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VinDisplay } from "@/components/vin-display";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import { customerDisplayName, formatCents } from "@/lib/format";
import { fmtDate } from "@/lib/datetime";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import type { CustomerDetail, CustomerDetailVehicle, CustomerPaymentSummary } from "@/server/customer-detail";
import type { ROStatus } from "@/generated/prisma";
import { EditVehicleDialog } from "@/components/repair-order/edit-vehicle-dialog";
import { EditCustomerDialog } from "@/components/repair-order/edit-customer-dialog";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import { SharePlansLinkButton } from "@/components/maintenance/share-plans-link-button";
import {
  CustomerMaintenancePanel,
  type CustomerMaintenanceEntry,
} from "@/components/customers/customer-maintenance-panel";
import { EmailCustomerDialog } from "@/components/customers/email-customer-dialog";
import { CustomerDataMenu } from "@/components/customers/customer-data-menu";

type Tab = "overview" | "vehicles" | "repair-orders" | "payments" | "maintenance" | "notes";

export function CustomerDetailView({
  customer,
  paymentHistory,
  maintenanceEntries = [],
  plansUrl,
  shopName,
  defaultTechnicianName = "",
  availableTags = [],
  canExportCustomer = false,
  canDeleteCustomer = false,
}: {
  customer: CustomerDetail;
  paymentHistory: CustomerPaymentSummary;
  maintenanceEntries?: CustomerMaintenanceEntry[];
  plansUrl?: string | null;
  shopName?: string;
  defaultTechnicianName?: string;
  availableTags?: string[];
  canExportCustomer?: boolean;
  canDeleteCustomer?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [editVehicle, setEditVehicle] = useState<CustomerDetailVehicle | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const router = useRouter();
  const { openIntake, config } = useRoIntakeOptional();

  const displayName = customerDisplayName(customer);
  const isRemoved = Boolean(customer.deletedAt || customer.anonymizedAt);
  const addressLine = [customer.address, customer.city, customer.state, customer.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4 workspace-surface">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/customers" className="hover:text-primary">Customers</Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{displayName}</span>
      </nav>

      {isRemoved ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {customer.anonymizedAt
            ? "This customer profile has been anonymized."
            : "Removal scheduled — personal data will be anonymized after the retention grace period."}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {customer.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" />
                {customer.phone}
              </span>
            ) : null}
            {customer.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" />
                {customer.email}
              </span>
            ) : null}
            {customer.leadSource ? (
              <Badge variant="secondary">Lead: {customer.leadSource}</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={isRemoved}
            onClick={() => setEditCustomerOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!customer.email}
            onClick={() => setEmailOpen(true)}
          >
            <Mail className="size-3.5" />
            Email
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href={`/messages?customerId=${customer.id}`}>
              <MessageSquare className="size-3.5" />
              Message
            </Link>
          </Button>
          {config ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => openIntake({ customerId: customer.id })}
            >
              <Plus className="size-3.5" />
              New RO
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={`/repair-orders/new?customerId=${customer.id}`}>
                <Plus className="size-3.5" />
                New RO
              </Link>
            </Button>
          )}
          <CustomerDataMenu
            customerId={customer.id}
            customerName={displayName}
            canExport={canExportCustomer}
            canDelete={canDeleteCustomer}
            isDeleted={isRemoved}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Lifetime sales" value={formatCents(customer.lifetimeTotalCents)} />
        <StatCard label="Open balance" value={formatCents(customer.openBalanceCents)} accent="text-brand-red" />
        <StatCard label="Repair orders" value={String(customer.repairOrders.length)} />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="scrollbar-none overflow-x-auto border-b px-4 pt-3">
          <nav className={cn(subnavBarClass(), "w-max min-w-full border-b-0")}>
            {(
              [
                ["overview", "Overview"],
                ["vehicles", `Vehicles (${customer.vehicles.length})`],
                ["repair-orders", `Repair Orders (${customer.repairOrders.length})`],
                ["payments", `Payments (${paymentHistory.payments.length})`],
                ["maintenance", `Maintenance (${maintenanceEntries.length})`],
                ["notes", "Notes"],
              ] as [Tab, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                aria-current={tab === k ? "page" : undefined}
                className={subnavTabClass(tab === k, "py-2")}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {tab === "overview" ? (
            <div className="grid gap-6 md:grid-cols-2">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Contact</h3>
                <dl className="space-y-2 text-sm">
                  <Row label="Phone" value={customer.phone ?? "—"} />
                  <Row label="Alt phone" value={customer.altPhone ?? "—"} />
                  <Row
                    label="Phone type"
                    value="—"
                    hint="Mobile/Home/Work is collected when adding customers; stored on profile coming soon."
                  />
                  <Row label="Email" value={customer.email ?? "—"} />
                  <Row label="Address" value={addressLine || "—"} icon={MapPin} />
                  <Row
                    label="Service SMS consent"
                    value={customer.transactionalSmsConsent ? "Yes" : "No"}
                  />
                  <Row
                    label="Marketing SMS"
                    value={customer.marketingOptIn ? "Yes" : "No"}
                  />
                  <Row
                    label="Marketing email"
                    value={customer.marketingEmailConsent ? "Yes" : "No"}
                  />
                </dl>
                {customer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {customer.tags.map((t) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Payments</h3>
                {paymentHistory.payments.length > 0 ? (
                  <dl className="space-y-2 text-sm">
                    <Row label="Total paid" value={formatCents(paymentHistory.totalPaidCents)} />
                    <Row
                      label="Last payment"
                      value={
                        paymentHistory.lastPaymentAt
                          ? fmtDate(paymentHistory.lastPaymentAt)
                          : "—"
                      }
                    />
                  </dl>
                ) : (
                  <p className="text-sm text-subtle-foreground">No payments recorded yet.</p>
                )}
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Text-to-Pay</p>
                    <p className="text-xs text-muted-foreground">
                      Send payment links by SMS (Stripe — coming soon)
                    </p>
                  </div>
                  <Checkbox checked={false} disabled aria-label="Text-to-Pay (coming soon)" />
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link href="/payments">
                    <MessageSquare className="size-3.5" />
                    Payment settings
                  </Link>
                </Button>
              </section>
            </div>
          ) : null}

          {tab === "vehicles" ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <AddVehicleDialog customerId={customer.id} onCreated={() => router.refresh()} />
              </div>
              {customer.vehicles.length === 0 ? (
                <EmptyState icon={Car} message="No vehicles on file." />
              ) : (
                <ul className="divide-y">
                  {customer.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <div>
                        <p className="font-medium">
                          {[v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Vehicle"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.vin ? (
                            <>
                              <span className="mr-1">VIN</span>
                              <VinDisplay vin={v.vin} className="text-xs" />
                            </>
                          ) : (
                            "No VIN"
                          )}
                          {v.plate ? ` · ${v.plate} ${v.plateState ?? ""}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={() => setEditVehicle(v)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "repair-orders" ? (
            customer.repairOrders.length === 0 ? (
              <EmptyState icon={Wrench} message="No repair orders yet." />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                      <th className="px-3 py-2">RO #</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Vehicle</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.repairOrders.map((ro) => {
                      const pill = RO_STATUS_PILL[ro.status as ROStatus];
                      return (
                        <tr key={ro.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <Link
                              href={defaultRoOpenHref(ro.id)}
                              className="font-medium text-brand-navy hover:underline"
                            >
                              #{ro.number}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {fmtDate(ro.createdAt)}
                          </td>
                          <td className="px-3 py-2">{ro.vehicleLabel}</td>
                          <td className="px-3 py-2">
                            <Badge className={cn("text-xs", pill?.className)}>{pill?.label ?? ro.status}</Badge>
                          </td>
                          <td className="px-3 py-2 tabular-nums">{formatCents(ro.totalCents)}</td>
                          <td className="px-3 py-2 tabular-nums">
                            {ro.balanceCents != null && ro.balanceCents > 0
                              ? formatCents(ro.balanceCents)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {tab === "payments" ? (
            paymentHistory.payments.length === 0 ? (
              <EmptyState icon={CreditCard} message="No payments recorded yet." />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">RO #</th>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-2 text-subtle-foreground">
                          {fmtDate(p.paidAt)}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={defaultRoOpenHref(p.repairOrderId)}
                            className="font-medium text-brand-navy hover:underline"
                          >
                            #{p.repairOrderNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{p.methodLabel}</td>
                        <td className="px-3 py-2 text-subtle-foreground">
                          {p.reference ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-700">
                          {formatCents(p.amountCents)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Succeeded
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {tab === "maintenance" ? (
            <div className="space-y-4">
              {plansUrl && shopName ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Enroll this customer in a maintenance plan or send them the signup link.
                  </p>
                  <SharePlansLinkButton
                    plansUrl={plansUrl}
                    shopName={shopName}
                    customer={{
                      id: customer.id,
                      firstName: customer.firstName,
                      phone: customer.phone,
                      email: customer.email,
                    }}
                  />
                </div>
              ) : null}
              {maintenanceEntries.length === 0 ? (
                <EmptyState icon={Shield} message="No maintenance memberships." />
              ) : (
                <CustomerMaintenancePanel
                  entries={maintenanceEntries}
                  defaultTechnicianName={defaultTechnicianName}
                />
              )}
            </div>
          ) : null}

          {tab === "notes" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {customer.notes?.trim() || "No notes on this customer."}
              </p>
              <p className="text-xs text-muted-foreground">
                Customer added {fmtDate(customer.createdAt)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <EditCustomerDialog
        customer={customer}
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        availableTags={availableTags}
      />

      {editVehicle ? (
        <EditVehicleDialog
          vehicle={editVehicle}
          customerId={customer.id}
          open={Boolean(editVehicle)}
          onOpenChange={(open) => {
            if (!open) setEditVehicle(null);
          }}
        />
      ) : null}

      <EmailCustomerDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        customerId={customer.id}
        customerName={displayName}
        email={customer.email}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", accent)}>{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right">
        <span className="flex items-center justify-end gap-1 font-medium">
          {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
          {value}
        </span>
        {hint ? <p className="mt-0.5 text-xs font-normal text-muted-foreground">{hint}</p> : null}
      </dd>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <Icon className="size-10 stroke-[1.25]" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
