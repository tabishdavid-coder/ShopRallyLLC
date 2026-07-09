import "server-only";

import { prisma } from "@/db/client";
import type { EmployeeRoleValue, PayrollTypeValue } from "@/lib/employees";

export type EmployeeRow = {
  membershipId: string;
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: EmployeeRoleValue;
  permissionGroup: string | null;
  permissionMode: "GROUP" | "INDIVIDUAL";
  accessTimes: string;
  payrollType: PayrollTypeValue | null;
  canPerformWork: boolean;
  active: boolean;
};

export type EmployeeDetail = EmployeeRow & {
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  certificationNumber: string | null;
  permissions: string[];
};

export type LoginEventRow = {
  id: string;
  loggedInAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

const ROLE_ORDER: Record<string, number> = { OWNER: 0, MANAGER: 1, SERVICE_WRITER: 2, TECHNICIAN: 3 };

function parsePermissions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === "string");
}

function mapRow(m: {
  id: string;
  userId: string;
  role: string;
  permissionGroup: string | null;
  permissionMode: string;
  permissions: unknown;
  accessTimes: string;
  payrollType: string | null;
  canPerformWork: boolean;
  active: boolean;
  user: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string;
  };
}): EmployeeRow {
  return {
    membershipId: m.id,
    userId: m.userId,
    name: `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() || "Unnamed",
    firstName: m.user.firstName ?? "",
    lastName: m.user.lastName ?? "",
    phone: m.user.phone,
    email: m.user.email,
    role: m.role as EmployeeRoleValue,
    permissionGroup: m.permissionGroup,
    permissionMode: m.permissionMode === "INDIVIDUAL" ? "INDIVIDUAL" : "GROUP",
    accessTimes: m.accessTimes,
    payrollType: m.payrollType as PayrollTypeValue | null,
    canPerformWork: m.canPerformWork,
    active: m.active,
  };
}

/** Employees (shop memberships) for the Employees list — active or deactivated. */
export async function getEmployees(
  shopId: string,
  opts: { active?: boolean; q?: string; permissionGroup?: string } = {},
): Promise<EmployeeRow[]> {
  const q = opts.q?.trim();
  const rows = await prisma.membership.findMany({
    where: {
      shopId,
      active: opts.active ?? true,
      ...(opts.permissionGroup ? { permissionGroup: opts.permissionGroup } : {}),
      ...(q
        ? {
            user: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { user: true },
  });

  return rows
    .map(mapRow)
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.lastName.localeCompare(b.lastName));
}

/** Single employee detail for the profile page. */
export async function getEmployeeDetail(shopId: string, membershipId: string): Promise<EmployeeDetail | null> {
  const m = await prisma.membership.findFirst({
    where: { id: membershipId, shopId },
    include: { user: true },
  });
  if (!m) return null;
  return {
    ...mapRow(m),
    address: m.user.address,
    address2: m.user.address2,
    city: m.user.city,
    state: m.user.state,
    zip: m.user.zip,
    certificationNumber: m.certificationNumber,
    permissions: parsePermissions(m.permissions),
  };
}

/** Login history for an employee (History tab). */
export async function getLoginHistory(shopId: string, userId: string, limit = 50): Promise<LoginEventRow[]> {
  const rows = await prisma.loginEvent.findMany({
    where: { shopId, userId },
    orderBy: { loggedInAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    loggedInAt: r.loggedInAt.toISOString(),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
  }));
}

/** Active vs deactivated counts for the toggle. */
export async function getEmployeeCounts(shopId: string): Promise<{ active: number; deactivated: number }> {
  const [active, deactivated] = await Promise.all([
    prisma.membership.count({ where: { shopId, active: true } }),
    prisma.membership.count({ where: { shopId, active: false } }),
  ]);
  return { active, deactivated };
}
