import { formatCents, customerDisplayName } from "@/lib/format";
import { formatPrintVehicleLabel } from "@/lib/print-vehicle-label";
import type { RepairOrderDetail } from "@/server/repair-order";
import { AutoPrint } from "@/components/print/auto-print";
import { CustomerAcknowledgment } from "@/components/customer-acknowledgment";
import type { DocTransparency } from "@/lib/transparency";

type Shop = {
  name: string;
  code: string;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
} | null;

type AcknowledgmentBlock = {
  html: string;
  version?: string | null;
};

function fmtDT(d: Date | null | undefined) {
  if (!d) return "N/A";
  const s = new Date(d).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "2-digit",
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  });
  return s.replace(", ", " at ");
}

function initials(name: string) {
  const words = name.replace(/[^a-zA-Z ]/g, " ").split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

export function PrintDocument({
  ro,
  shop,
  title,
  doc,
  transparency,
  acknowledgment,
}: {
  ro: RepairOrderDetail;
  shop: Shop;
  title: string;
  doc: string;
  transparency: DocTransparency;
  acknowledgment?: AcknowledgmentBlock | null;
}) {
  const T = transparency;
  const vehicleLabel = formatPrintVehicleLabel(ro.vehicle);
  const taxBps = ro.shop.taxRateBps;
  const isInvoice = doc === "invoice";
  const showCost = doc === "repair-order";
  const approved = Boolean(ro.authorizedAt);

  const cityLine = [shop?.city, shop?.state].filter(Boolean).join(", ");

  const totalJobs = ro.laborSubtotalCents + ro.partsSubtotalCents;
  const fees = ro.feesSubtotalCents;
  const discount = ro.discountCents;
  const subtotal = totalJobs + fees - discount + (ro.shopSuppliesCents ?? 0);
  const grandTotal = ro.totalCents;
  const balance = ro.invoice?.balanceCents ?? grandTotal;
  const paid = grandTotal - balance;
  const payments = ro.invoice?.payments ?? [];

  return (
    <div className="mx-auto max-w-[8.5in] bg-white px-8 pt-6 pb-16 text-[12px] text-slate-900">
      <AutoPrint />

      {/* Letterhead */}
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          {shop?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logoUrl} alt={shop?.name ?? "Shop"} className="size-20 shrink-0 rounded object-contain" />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded bg-brand-navy text-2xl font-black text-white">
              {initials(shop?.name ?? "Shop").toUpperCase()}
            </div>
          )}
          <div className="leading-snug">
            <div className="text-[15px] font-bold">{shop?.name ?? "Shop"}</div>
            {shop?.address ? <div>{shop.address}</div> : null}
            {shop?.address2 ? <div>{shop.address2}</div> : null}
            {(cityLine || shop?.zip) ? <div>{[cityLine, shop?.zip].filter(Boolean).join(" ")}</div> : null}
            {shop?.phone ? <div>{shop.phone}</div> : null}
            {shop?.email ? <div className="font-medium text-brand-navy underline decoration-brand-light/70 underline-offset-2">{shop.email}</div> : null}
            {shop?.website ? <div className="font-medium text-brand-navy underline decoration-brand-light/70 underline-offset-2">{shop.website}</div> : null}
          </div>
        </div>
        <div className="text-right leading-relaxed">
          <div className="text-[17px] font-bold">{title} for RO #{ro.number}</div>
          <div><b>Service Advisor:</b> {ro.serviceWriterName ?? "—"}</div>
          <div><b>Date Created:</b> {fmtDT(ro.createdAt)}</div>
          <div><b>Client:</b> {customerDisplayName(ro.customer)}</div>
          <div><b>Vehicle:</b> {vehicleLabel}</div>
          <div>
            <b>Odometer In:</b>{" "}
            {ro.odometerNotWorking
              ? "Not working"
              : ro.mileageIn != null
                ? `${ro.mileageIn.toLocaleString("en-US")} mi`
                : "—"}
          </div>
          {ro.mileageOut != null ? (
            <div>
              <b>Odometer Out:</b> {ro.mileageOut.toLocaleString("en-US")} mi
            </div>
          ) : null}
        </div>
      </div>

      {/* Jobs */}
      <div className="mt-4 space-y-3">
        {ro.jobs.map((job, i) => {
          const labor = job.laborLines.reduce((s, l) => s + l.totalCents, 0);
          const parts = job.partLines.reduce((s, p) => s + p.totalCents, 0);
          const sub = labor + parts;
          // Mirror recomputeRoTotals: per-line taxable wins; shop gates still apply.
          const taxableLabor = ro.shop.taxOnLabor
            ? job.laborLines
                .filter((l) => (("taxable" in l ? l.taxable : undefined) ?? job.laborTaxable) === true)
                .reduce((s, l) => s + l.totalCents, 0)
            : 0;
          const taxableParts = ro.shop.taxOnParts
            ? job.partLines
                .filter((p) => (("taxable" in p ? p.taxable : undefined) ?? job.partsTaxable) === true)
                .reduce((s, p) => s + p.totalCents, 0)
            : 0;
          const tax = Math.round(((taxableLabor + taxableParts) * taxBps) / 10000);
          return (
            <div key={job.id} className="break-inside-avoid border border-slate-300">
              <div className="bg-slate-100 px-2 py-1 text-[12px] font-bold">{i + 1} - {job.name}</div>
              <table className="w-full">
                <tbody>
                  {job.laborLines.map((l, k) => (
                    <tr key={l.id} className="border-b border-slate-100">
                      <td className="w-16 py-1 pl-2 align-top font-medium italic text-brand-navy">{k === 0 ? "Labor:" : ""}</td>
                      <td className="py-1">{l.description}</td>
                      <td className="w-14 py-1 text-right tabular-nums text-slate-500">{T.laborHours && l.hours ? `${l.hours} hr` : ""}</td>
                      {showCost ? <td className="w-20 py-1 text-right tabular-nums text-slate-500">{formatCents(l.rateCents)}</td> : null}
                      <td className="w-24 py-1 pr-2 text-right tabular-nums">{T.lineItemPrices ? formatCents(l.totalCents) : ""}</td>
                    </tr>
                  ))}
                  {job.partLines.map((p, k) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="w-16 py-1 pl-2 align-top font-medium italic text-brand-navy">{k === 0 ? "Part:" : ""}</td>
                      <td className="py-1">
                        {T.partBrand && p.brand ? `${p.brand} ` : ""}{p.description}
                        {T.partNumbers && p.partNumber ? <span className="text-slate-500"> (#{p.partNumber})</span> : null}
                      </td>
                      <td className="w-14 py-1 text-right tabular-nums">{p.quantity}</td>
                      {showCost ? <td className="w-20 py-1 text-right tabular-nums text-slate-500">{formatCents(p.costCents)}</td> : null}
                      <td className="w-24 py-1 pr-2 text-right tabular-nums">{T.lineItemPrices ? formatCents(p.totalCents) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Job footer */}
              <div className="flex items-center gap-4 border-t border-slate-300 px-2 py-1.5">
                <div className="flex items-center gap-2 text-[12px]">
                  {approved ? (
                    <span className="text-brand-navy">✓ Approved on {fmtDT(ro.authorizedAt)}</span>
                  ) : (
                    <>
                      <span className="inline-block size-3 border border-slate-500" /> APPROVE
                      <span className="mx-1">or</span>
                      <span className="inline-block size-3 border border-slate-500" /> DECLINE
                    </>
                  )}
                </div>
                <div className="ml-auto italic text-slate-600">Subtotal {formatCents(sub)} + est. Tax {formatCents(tax)}</div>
                <div className="w-24 text-right font-bold tabular-nums">{formatCents(sub + tax)}</div>
              </div>
            </div>
          );
        })}
        {ro.jobs.length === 0 ? <div className="text-slate-500">No jobs on this repair order.</div> : null}
      </div>

      {/* Signature + totals */}
      <div className="mt-8 flex items-start justify-between gap-8">
        <div className="flex-1">
          <div className="font-bold">Work Authorization Signature:</div>
          <div className="mt-10 flex items-end gap-2">
            <span>X</span>
            <span className="flex-1 border-b border-dashed border-slate-500" />
          </div>
        </div>
        <table className="w-64 text-right">
          <tbody>
            <TRow label="Total Jobs:" value={formatCents(totalJobs)} />
            {fees > 0 ? <TRow label="Total Fees:" value={formatCents(fees)} /> : null}
            {discount > 0 ? <TRow label="Discounts:" value={`-${formatCents(discount)}`} /> : null}
            <TRow label="Subtotal:" value={formatCents(subtotal)} bold />
            <TRow label="Taxes:" value={formatCents(ro.taxCents)} />
            <TRow label="Grand Total:" value={formatCents(grandTotal)} bold />
            <tr>
              <td className="py-0.5 pr-3 font-bold">BALANCE DUE:</td>
              <td className="py-0.5 font-bold tabular-nums">{formatCents(balance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {isInvoice && balance === 0 ? (
        <div className="mt-2 flex justify-end">
          <span className="rounded border border-slate-400 px-3 py-1 text-[12px] font-semibold">✓ PAID</span>
        </div>
      ) : null}

      {/* Payment history (invoice) */}
      {isInvoice && payments.length > 0 ? (
        <div className="mt-6 border border-slate-300">
          <div className="flex items-center justify-between bg-slate-100 px-2 py-1 font-bold">
            <span>Payment History</span>
            <span>Payment Signature</span>
          </div>
          <table className="w-full">
            <tbody>
              {payments.map((pay) => (
                <tr key={pay.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pl-2">{new Date(pay.paidAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}</td>
                  <td className="py-2">{customerDisplayName(ro.customer)}</td>
                  <td className="py-2 tabular-nums">{formatCents(pay.amountCents)}</td>
                  <td className="py-2">{pay.method} Payment</td>
                  <td className="py-2 pr-2 text-slate-600">{pay.reference ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {acknowledgment?.html ? (
        <CustomerAcknowledgment
          html={acknowledgment.html}
          version={acknowledgment.version}
          variant="print"
          heading={isInvoice ? "Customer acknowledgment" : "Customer acknowledgment & authorization"}
        />
      ) : null}

      {/* Footer */}
      <div className="fixed inset-x-0 bottom-0 flex justify-between border-t border-brand-navy/15 px-8 py-2 text-[11px] text-brand-navy">
        <span>{shop?.name ?? "Shop"} - RO# {ro.number}</span>
        <span>Printed on {fmtDT(new Date())} - Page 1 of 1</span>
      </div>
    </div>
  );
}

function TRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? "font-bold" : ""}>
      <td className="py-0.5 pr-3">{label}</td>
      <td className="py-0.5 tabular-nums">{value}</td>
    </tr>
  );
}
