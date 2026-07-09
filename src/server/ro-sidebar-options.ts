import "server-only";

import { prisma } from "@/db/client";
import { APPOINTMENT_OPTIONS, LEAD_SOURCES } from "@/lib/options";
import { resolveAdvanced } from "@/lib/ro-settings";
import { getLeadSourceNames } from "@/server/actions/marketing";

export type StaffPick = { id: string; name: string };
export type LaborRatePick = { name: string; rateCents: number; isDefault: boolean };

/** Picker data for the RO detail sidebar (staff, rates, lead sources). */
export async function getRoSidebarOptions(shopId: string) {
  const [memberships, rates, leadSources, shop] = await Promise.all([
    prisma.membership.findMany({
      where: { shopId, active: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ role: "asc" }, { user: { lastName: "asc" } }],
    }),
    prisma.laborRate.findMany({
      where: { shopId },
      orderBy: { sortOrder: "asc" },
      select: { name: true, rateCents: true, isDefault: true },
    }),
    getLeadSourceNames(),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { laborRateCents: true, roAdvanced: true },
    }),
  ]);

  const nameOf = (u: { firstName: string | null; lastName: string | null }) =>
    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unnamed";

  const serviceWriters: StaffPick[] = memberships
    .filter((m) => ["OWNER", "MANAGER", "SERVICE_WRITER"].includes(m.role))
    .map((m) => ({ id: m.user.id, name: nameOf(m.user) }));

  const technicians: StaffPick[] = memberships
    .filter((m) => m.canPerformWork)
    .map((m) => ({ id: m.user.id, name: nameOf(m.user) }));

  const fallback = shop?.laborRateCents ?? 15000;
  const laborRates: LaborRatePick[] = rates.length
    ? rates
    : [{ name: "Standard labor rate", rateCents: fallback, isDefault: true }];

  const advanced = resolveAdvanced(shop?.roAdvanced);

  return {
    serviceWriters,
    technicians,
    laborRates,
    leadSources: leadSources.length ? leadSources : [...LEAD_SOURCES],
    appointmentOptions: [...APPOINTMENT_OPTIONS],
    reqOdometer: advanced.reqOdometer,
  };
}

export type RoSidebarOptions = Awaited<ReturnType<typeof getRoSidebarOptions>>;
