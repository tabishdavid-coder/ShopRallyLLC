import { APPOINTMENT_STATUS_META } from "@/lib/appointments";
import type { AppointmentRow, CalendarBlockRow } from "@/server/appointments";

function formatTimeRange(startAt: string | Date, endAt: string | Date) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString("en-US", opts)} – ${end.toLocaleTimeString("en-US", opts)}`;
}

function purposeLabel(a: AppointmentRow) {
  return a.serviceName?.trim() || a.title?.trim() || "Appointment";
}

export function AppointmentsDayPrint({
  shopName,
  shopPhone,
  dayLabel,
  shopHours,
  appointments,
  blocks,
}: {
  shopName: string;
  shopPhone?: string | null;
  dayLabel: string;
  shopHours: string;
  appointments: AppointmentRow[];
  blocks: CalendarBlockRow[];
}) {
  const rows = [
    ...appointments.map((a) => ({
      kind: "appointment" as const,
      startAt: a.startAt,
      endAt: a.endAt,
      a,
    })),
    ...blocks.map((b) => ({
      kind: "block" as const,
      startAt: b.startAt,
      endAt: b.endAt,
      b,
    })),
  ].sort((x, y) => new Date(x.startAt).getTime() - new Date(y.startAt).getTime());

  const printedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="appointments-day-sheet mx-auto max-w-[8.5in] bg-white px-6 py-7 text-[12.5px] leading-snug text-slate-900 print:max-w-none print:px-0 print:py-0">
      <header className="border-b-2 border-slate-800 pb-4 print:border-black">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-navy print:text-slate-600">
              ShopRally · Day sheet
            </div>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900 print:text-black">
              {shopName}
            </h1>
            <p className="mt-1.5 text-[15px] font-semibold text-slate-800 print:text-black">
              {dayLabel}
            </p>
            <p className="mt-1 text-[12px] text-slate-600 print:text-slate-700">
              Shop hours {shopHours}
              {shopPhone ? (
                <>
                  <span className="mx-1.5 text-slate-300 print:text-slate-400" aria-hidden>
                    ·
                  </span>
                  {shopPhone}
                </>
              ) : null}
            </p>
          </div>
          <div className="shrink-0 text-right text-[11px] text-slate-500 print:text-slate-600">
            <div className="font-semibold uppercase tracking-wide text-slate-400 print:text-slate-500">
              Floor copy
            </div>
            <div className="mt-1">Printed {printedAt}</div>
            <div className="mt-2 rounded border border-slate-200 px-2.5 py-1.5 text-left print:border-slate-400">
              <div className="tabular-nums font-semibold text-slate-800">
                {appointments.length} appt{appointments.length === 1 ? "" : "s"}
              </div>
              {blocks.length > 0 ? (
                <div className="tabular-nums text-slate-600">
                  {blocks.length} block{blocks.length === 1 ? "" : "s"}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="mt-10 rounded border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 print:border-slate-400">
          No appointments or blocked time scheduled for this day.
        </div>
      ) : (
        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-400 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 print:border-black print:text-slate-700">
              <th className="w-[7.5rem] py-2 pr-3">Time</th>
              <th className="py-2 pr-3">Customer</th>
              <th className="w-[9.5rem] py-2 pr-3">Vehicle</th>
              <th className="w-[8.5rem] py-2 pr-3">Service / purpose</th>
              <th className="w-[6.5rem] py-2 pr-3">Tech</th>
              <th className="w-[5.5rem] py-2 pr-3">Status</th>
              <th className="min-w-[5rem] py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const time = formatTimeRange(row.startAt, row.endAt);

              if (row.kind === "block") {
                return (
                  <tr
                    key={`b-${row.b.id}`}
                    className="break-inside-avoid border-b border-slate-300 bg-slate-100 print:bg-slate-100 print:border-slate-400"
                  >
                    <td className="py-3 pr-3 align-top font-semibold tabular-nums whitespace-nowrap text-slate-800">
                      {time}
                    </td>
                    <td className="py-3 pr-3 align-top" colSpan={3}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded border border-slate-500 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700 print:border-black">
                          Blocked
                        </span>
                        <span className="font-bold text-slate-900">{row.b.title}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        Calendar block — lunch, training, or closed time
                      </p>
                    </td>
                    <td className="py-3 pr-3 align-top text-slate-400">—</td>
                    <td className="py-3 pr-3 align-top text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Block
                    </td>
                    <td className="py-3 align-top text-slate-700">{row.b.notes ?? ""}</td>
                  </tr>
                );
              }

              const a = row.a;
              const status = APPOINTMENT_STATUS_META[a.status];
              const customerName = a.customer?.name ?? a.title;
              const phone = a.customer?.phone;

              return (
                <tr
                  key={`a-${a.id}`}
                  className="break-inside-avoid border-b border-slate-200 print:border-slate-300"
                >
                  <td className="py-3 pr-3 align-top font-semibold tabular-nums whitespace-nowrap text-slate-900">
                    {time}
                    {a.bay ? (
                      <div className="mt-0.5 text-[10px] font-normal text-slate-500">
                        Bay {a.bay}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <div className="font-semibold text-slate-900">{customerName}</div>
                    {phone ? (
                      <div className="mt-0.5 tabular-nums text-[11px] text-slate-600">
                        {phone}
                      </div>
                    ) : null}
                    {a.repairOrderNumber != null ? (
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                        RO #{a.repairOrderNumber}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 align-top text-slate-800">
                    {a.vehicle?.label ?? "—"}
                  </td>
                  <td className="py-3 pr-3 align-top text-slate-800">{purposeLabel(a)}</td>
                  <td className="py-3 pr-3 align-top text-slate-800">
                    {a.technician?.name ?? "—"}
                  </td>
                  <td className="py-3 pr-3 align-top font-medium text-slate-800">
                    {status.label}
                  </td>
                  <td className="py-3 align-top text-slate-600">{a.notes ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <footer className="mt-8 flex items-end justify-between gap-4 border-t border-slate-300 pt-3 text-[10px] text-slate-500 print:mt-6 print:border-slate-400">
        <div>
          {appointments.length} appointment{appointments.length === 1 ? "" : "s"}
          {blocks.length > 0
            ? ` · ${blocks.length} blocked period${blocks.length === 1 ? "" : "s"}`
            : ""}
          <span className="mx-1.5">·</span>
          Check off as vehicles arrive
        </div>
        <div className="text-right">
          <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">
            Sign-off
          </div>
          <div className="w-40 border-b border-slate-400 pb-0.5 print:border-black" />
        </div>
      </footer>
    </div>
  );
}
