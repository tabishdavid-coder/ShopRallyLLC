import { customerDisplayName } from "@/lib/format";
import { formatPrintVehicleLabel } from "@/lib/print-vehicle-label";
import { RO_STATUS_LABEL } from "@/lib/ro-status";
import type { RepairOrderDetail } from "@/server/repair-order";
import { AutoPrint } from "@/components/print/auto-print";

type Shop = {
  name: string;
  phone: string | null;
  logoUrl: string | null;
} | null;

function initials(name: string) {
  const words = name.replace(/[^a-zA-Z ]/g, " ").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "SR";
}

function plateLine(vehicle: RepairOrderDetail["vehicle"]): string | null {
  if (!vehicle?.plate) return null;
  return [vehicle.plate, vehicle.plateState].filter(Boolean).join(" ");
}

function primaryConcern(ro: RepairOrderDetail): string | null {
  const fromRecords = ro.vehicleConcerns.find((c) => c.kind === "CUSTOMER")?.text?.trim();
  if (fromRecords) return fromRecords;
  const fromLegacy = ro.concerns.find((c) => c.trim())?.trim();
  return fromLegacy || null;
}

/** Hang-tag / key-tag style RO label for shop floor printing. */
export function PrintRoLabel({ ro, shop }: { ro: RepairOrderDetail; shop: Shop }) {
  const shopName = shop?.name ?? "Shop";
  const customer = customerDisplayName(ro.customer, { nameOrder: "firstLast" });
  const vehicle = formatPrintVehicleLabel(ro.vehicle);
  const plate = plateLine(ro.vehicle);
  const status = RO_STATUS_LABEL[ro.status] ?? ro.status;
  const concern = primaryConcern(ro);
  const advisor = ro.serviceWriterName ?? ro.serviceAdvisor?.name ?? null;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      <AutoPrint />

      <div className="mx-auto w-full max-w-[4.25in] overflow-hidden rounded-sm border-2 border-brand-navy bg-white shadow-md print:mx-0 print:max-w-none print:shadow-none">
        {/* Brand header */}
        <div className="flex items-center gap-3 bg-brand-navy px-4 py-3 text-white">
          {shop?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shop.logoUrl}
              alt={shopName}
              className="size-10 shrink-0 rounded-sm bg-white object-contain p-0.5"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-white text-sm font-black text-brand-navy">
              {initials(shopName)}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold tracking-wide">{shopName}</div>
            {shop?.phone ? (
              <div className="truncate text-[11px] text-brand-light">{shop.phone}</div>
            ) : null}
          </div>
        </div>

        <div className="h-1 bg-brand-red" />

        <div className="space-y-3 px-4 py-4 text-slate-900">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/70">
              Repair order
            </div>
            <div className="mt-0.5 text-3xl font-black tabular-nums tracking-tight text-brand-navy">
              #{ro.number}
            </div>
          </div>

          <div className="space-y-2 border-y border-brand-navy/15 py-3 text-[13px] leading-snug">
            <Row label="Customer" value={customer} />
            <Row label="Vehicle" value={vehicle} />
            {plate ? <Row label="Plate" value={plate} /> : null}
            <Row label="Status" value={status} />
            {advisor ? <Row label="Advisor" value={advisor} /> : null}
            {concern ? <Row label="Concern" value={concern} /> : null}
          </div>

          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-brand-navy/55">
            <span>
              Shop<span className="text-brand-red">Rally</span>
            </span>
            <span>Hang on key / dash</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
