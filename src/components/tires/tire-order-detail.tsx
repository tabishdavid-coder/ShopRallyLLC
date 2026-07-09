"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, Loader2, Package, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/format";
import {
  TIRE_ORDER_STATUSES,
  TIRE_SOURCE_LABELS,
  TIRE_STATUS_COLORS,
  TIRE_STATUS_LABELS,
  tireSizeLabel,
  vehicleLabel,
} from "@/lib/tires";
import {
  approveTireSupplierOrder,
  recordTireDeposit,
  rejectTireSupplierOrder,
  updateTireOrderNotes,
  updateTireOrderStatus,
} from "@/server/actions/tires";
import type { TireOrderDetail } from "@/server/tires";

export function TireOrderDetailView({ order }: { order: TireOrderDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(order.notes ?? "");
  const [depositAmount, setDepositAmount] = useState(
    order.depositCents ? String(order.depositCents / 100) : "",
  );
  const [depositMethod, setDepositMethod] = useState<string>("CASH");
  const [depositReference, setDepositReference] = useState(order.depositReference ?? "");
  const [supplierQuote, setSupplierQuote] = useState(
    order.supplierQuoteCents != null ? String(order.supplierQuoteCents / 100) : "",
  );
  const [rejectNote, setRejectNote] = useState("");
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  function changeStatus(status: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateTireOrderStatus({ id: order.id, status: status as typeof order.status });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function saveNotes() {
    setError(null);
    startTransition(async () => {
      const res = await updateTireOrderNotes({ id: order.id, notes });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function recordDeposit() {
    setError(null);
    setApprovalMessage(null);
    const cents = Math.round(parseFloat(depositAmount) * 100);
    if (!cents || cents <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }
    startTransition(async () => {
      const res = await recordTireDeposit({
        id: order.id,
        depositCents: cents,
        depositMethod: depositMethod as "CASH" | "CARD" | "CHECK" | "OTHER",
        depositReference: depositReference.trim() || null,
      });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function approveSupplier() {
    setError(null);
    setApprovalMessage(null);
    const quoteCents = supplierQuote.trim()
      ? Math.round(parseFloat(supplierQuote) * 100)
      : undefined;
    if (supplierQuote.trim() && (!quoteCents || quoteCents < 0)) {
      setError("Enter a valid supplier cost or leave blank.");
      return;
    }
    startTransition(async () => {
      const res = await approveTireSupplierOrder({
        id: order.id,
        supplierQuoteCents: quoteCents,
      });
      if (res.ok) {
        setApprovalMessage(res.message ?? "Supplier order submitted.");
        router.refresh();
      } else setError(res.error);
    });
  }

  function rejectSupplier() {
    setError(null);
    setApprovalMessage(null);
    if (!rejectNote.trim()) {
      setError("Enter a reason before rejecting.");
      return;
    }
    startTransition(async () => {
      const res = await rejectTireSupplierOrder({ id: order.id, note: rejectNote.trim() });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const timeline = [
    { label: "Lead created", at: order.createdAt, done: true },
    {
      label: "Deposit received",
      at: order.depositPaidAt,
      done: Boolean(order.depositPaidAt),
    },
    {
      label: "Supplier approved",
      at: order.supplierApprovedAt,
      done: Boolean(order.supplierApprovedAt),
    },
    {
      label: "Install scheduled",
      at: order.appointment?.startAt ?? null,
      done: Boolean(order.appointment),
    },
    {
      label: "Installed",
      at: order.status === "INSTALLED" || order.status === "COMPLETE" ? order.updatedAt : null,
      done: order.status === "INSTALLED" || order.status === "COMPLETE",
    },
    {
      label: "Complete",
      at: order.status === "COMPLETE" ? order.updatedAt : null,
      done: order.status === "COMPLETE",
    },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">Tire order #{order.number}</h1>
              <Badge variant="secondary" className={TIRE_STATUS_COLORS[order.status]}>
                {TIRE_STATUS_LABELS[order.status]}
              </Badge>
              <Badge variant="outline">
                {TIRE_SOURCE_LABELS[order.source as keyof typeof TIRE_SOURCE_LABELS]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {fmtDateTime(order.createdAt)}
            </p>
          </div>
          <Select value={order.status} onValueChange={changeStatus} disabled={pending}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIRE_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TIRE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div className="rounded-md border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <User className="size-4 text-brand-navy" />
              Customer
            </h2>
            <p className="font-medium">{order.customerName}</p>
            {order.customer.phone ? <p className="text-sm">{order.customer.phone}</p> : null}
            {order.customer.email ? (
              <p className="text-sm text-muted-foreground">{order.customer.email}</p>
            ) : null}
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link href={`/customers?q=${encodeURIComponent(order.customerName)}`}>View in customers</Link>
            </Button>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Vehicle</h2>
            <p className="font-medium">{vehicleLabel(order.vehicle)}</p>
            {order.vehicle?.vin ? (
              <p className="font-mono text-xs text-muted-foreground">{order.vehicle.vin}</p>
            ) : null}
            {order.vehicle?.plate ? (
              <p className="text-sm text-muted-foreground">Plate: {order.vehicle.plate}</p>
            ) : null}
          </section>
        </div>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Tire details</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Size</dt>
              <dd className="font-mono">{tireSizeLabel(order.tireSizeFront, order.tireSizeRear)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Brand</dt>
              <dd>{order.tireBrand ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Quantity</dt>
              <dd>{order.tireQuantity}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="capitalize">{order.tireType?.replace("-", " ") ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Drop-off</dt>
              <dd className="capitalize">{order.dropOffType?.replace("-", " ") ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estimated total</dt>
              <dd>
                {order.estimatedTotalCents != null
                  ? formatCents(order.estimatedTotalCents)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {order.status === "PENDING_SUPPLIER_APPROVAL" ? (
          <section className="rounded-lg border-2 border-brand-red/30 bg-brand-red/5 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-red">
              <Package className="size-4" />
              Supplier approval required
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Customer paid a deposit on the website. Review the summary below and approve to
              submit to {order.supplierName ?? "Weldon Tire"} — nothing is purchased until you
              approve.
            </p>
            <dl className="mb-4 grid gap-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Retail estimate</dt>
                <dd className="font-medium">
                  {order.estimatedTotalCents != null
                    ? formatCents(order.estimatedTotalCents)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Deposit received</dt>
                <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                  {formatCents(order.depositCents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tires</dt>
                <dd>
                  {order.tireQuantity}× {order.tireBrand ?? "Any brand"}{" "}
                  <span className="font-mono text-xs">
                    ({tireSizeLabel(order.tireSizeFront, order.tireSizeRear)})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Vehicle</dt>
                <dd>{vehicleLabel(order.vehicle)}</dd>
              </div>
            </dl>
            <div className="mb-4 space-y-1.5">
              <Label htmlFor="supQuote">Supplier cost ($) — optional</Label>
              <Input
                id="supQuote"
                inputMode="decimal"
                placeholder="Wholesale quote from Weldon portal"
                value={supplierQuote}
                onChange={(e) => setSupplierQuote(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={approveSupplier} disabled={pending}>
                {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Approve &amp; submit order
              </Button>
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <Label htmlFor="rejectNote">Reject / request changes</Label>
              <Textarea
                id="rejectNote"
                rows={2}
                placeholder="e.g. Size unavailable — call customer to confirm alternate"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={rejectSupplier} disabled={pending}>
                Reject
              </Button>
            </div>
            {approvalMessage ? (
              <p className="mt-3 text-sm text-brand-navy">{approvalMessage}</p>
            ) : null}
          </section>
        ) : null}

        {(order.supplierApprovedAt || order.supplierOrderRef) && order.status !== "PENDING_SUPPLIER_APPROVAL" ? (
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4 text-brand-navy" />
              Supplier order
            </h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Supplier</dt>
                <dd>{order.supplierName ?? "Weldon Tire"}</dd>
              </div>
              {order.supplierQuoteCents != null ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Supplier cost</dt>
                  <dd>{formatCents(order.supplierQuoteCents)}</dd>
                </div>
              ) : null}
              {order.supplierOrderRef ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Order ref</dt>
                  <dd className="font-mono text-xs">{order.supplierOrderRef}</dd>
                </div>
              ) : null}
              {order.supplierApprovedAt ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Approved</dt>
                  <dd>{fmtDateTime(order.supplierApprovedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {order.supplierRejectionNote ? (
          <section className="rounded-lg border border-amber-300/50 bg-amber-50 p-4 dark:bg-amber-950/30">
            <h2 className="mb-2 text-sm font-semibold">Supplier review note</h2>
            <p className="text-sm">{order.supplierRejectionNote}</p>
            {order.supplierRejectedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDateTime(order.supplierRejectedAt)}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-brand-navy" />
            Appointment
          </h2>
          {order.appointment ? (
            <>
              <p className="font-medium">{order.appointment.title}</p>
              <p className="text-sm">
                {fmtDateTime(order.appointment.startAt, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" – "}
                {fmtDateTime(order.appointment.endAt, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                Status: {order.appointment.status.toLowerCase().replace("_", " ")}
              </p>
              <Button variant="link" className="mt-2 h-auto p-0" asChild>
                <Link href="/appointments">Open calendar</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No install appointment scheduled.</p>
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Notes</h2>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="mt-3" size="sm" variant="secondary" onClick={saveNotes} disabled={pending}>
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save notes
          </Button>
        </section>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Deposit</h2>
          {order.depositPaidAt ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                {formatCents(order.depositCents)} received
              </p>
              <p className="text-xs text-muted-foreground">
                {fmtDateTime(order.depositPaidAt)}
                {order.depositMethod ? ` · ${order.depositMethod}` : ""}
              </p>
              {order.depositReference ? (
                <p className="text-xs text-muted-foreground">Ref: {order.depositReference}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="depAmt">Amount ($)</Label>
                <Input
                  id="depAmt"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={depositMethod} onValueChange={setDepositMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depRef">Reference</Label>
                <Input id="depRef" value={depositReference} onChange={(e) => setDepositReference(e.target.value)} />
              </div>
              <Button className="w-full" onClick={recordDeposit} disabled={pending}>
                {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Record deposit
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
          <ol className="space-y-3">
            {timeline.map((step) => (
              <li key={step.label} className="flex gap-3">
                <span
                  className={`mt-1 size-2.5 shrink-0 rounded-full ${
                    step.done ? "bg-brand-navy" : "bg-muted"
                  }`}
                />
                <div>
                  <p className={`text-sm ${step.done ? "font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {step.at ? (
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(step.at)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {order.websiteSubmissionId ? (
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Website</h2>
            <p className="font-mono text-xs text-muted-foreground">{order.websiteSubmissionId}</p>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
