"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { roleLabel } from "@/lib/employees";
import { getShopId } from "@/lib/shop";
import { getEmployees, type EmployeeRow } from "@/server/employees";
import { allPermissionKeys } from "@/lib/permissions";
import { gates } from "@/server/permission-gates";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

/** Re-fetch the employee list (active/deactivated + search + group filter) for the client table. */
export async function listEmployees(
  active: boolean,
  q: string,
  permissionGroup?: string,
): Promise<EmployeeRow[]> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return [];
  return getEmployees(shopId, { active, q, permissionGroup: permissionGroup || undefined });
}

export type EmployeeActionResult = { ok: true; id: string } | { ok: false; error: string };
export type EmployeeToggleResult = { ok: true } | { ok: false; error: string };
export type EmployeeSaveResult = { ok: true } | { ok: false; error: string };

const AddEmployeeInput = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(160).optional().nullable(),
  address2: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(40).optional().nullable(),
  zip: z.string().trim().max(20).optional().nullable(),
  role: z.enum(["OWNER", "MANAGER", "SERVICE_WRITER", "TECHNICIAN"]),
  payrollType: z.enum(["SALARY", "FLAT_RATE", "HOURLY"]).optional().nullable(),
  canPerformWork: z.boolean(),
  certificationNumber: z.string().trim().max(60).optional().nullable(),
  permissionMode: z.enum(["GROUP", "INDIVIDUAL"]).optional(),
  permissionGroup: z.string().trim().max(60).optional().nullable(),
  permissions: z.array(z.string()).optional(),
  accessTimes: z.string().trim().max(60).optional(),
});

export type AddEmployeeInput = z.infer<typeof AddEmployeeInput>;

const validKeys = new Set(allPermissionKeys());

/** Create an employee = a User (person) + a Membership (shop employment). */
export async function addEmployee(raw: AddEmployeeInput): Promise<EmployeeActionResult> {
  const parsed = AddEmployeeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const contact = {
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone || null,
    address: d.address || null,
    address2: d.address2 || null,
    city: d.city || null,
    state: d.state || null,
    zip: d.zip || null,
  };

  const existing = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
  let userId: string;
  if (existing) {
    userId = existing.id;
    await prisma.user.update({ where: { id: userId }, data: contact });
    const dupe = await prisma.membership.findUnique({ where: { shopId_userId: { shopId, userId } }, select: { id: true } });
    if (dupe) return { ok: false, error: "This person is already an employee at this shop." };
  } else {
    const user = await prisma.user.create({ data: { email: d.email, ...contact }, select: { id: true } });
    userId = user.id;
  }

  const isOwner = d.role === "OWNER";
  const permissionMode = isOwner ? "GROUP" : d.permissionMode ?? "GROUP";
  const permissionGroup = isOwner ? null : permissionMode === "GROUP" ? d.permissionGroup || null : null;
  const permissions = isOwner || permissionMode !== "INDIVIDUAL"
    ? []
    : (d.permissions ?? []).filter((k) => validKeys.has(k));

  const membership = await prisma.membership.create({
    data: {
      shopId,
      userId,
      role: d.role,
      payrollType: d.payrollType ?? null,
      canPerformWork: d.canPerformWork,
      certificationNumber: d.certificationNumber || null,
      permissionMode,
      permissionGroup,
      permissions,
      accessTimes: d.accessTimes || "Anytime",
      active: true,
    },
    select: { id: true },
  });

  revalidatePath("/employees");
  return { ok: true, id: membership.id };
}

/** Deactivate / reactivate an employee (shop-scoped). */
export async function setEmployeeActive(membershipId: string, active: boolean): Promise<EmployeeToggleResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const m = await prisma.membership.findFirst({ where: { id: membershipId, shopId }, select: { id: true, role: true } });
  if (!m) return { ok: false, error: "Employee not found." };
  if (!active && m.role === "OWNER") {
    const owners = await prisma.membership.count({ where: { shopId, role: "OWNER", active: true } });
    if (owners <= 1) return { ok: false, error: "You can't deactivate the only owner." };
  }
  await prisma.membership.update({ where: { id: membershipId }, data: { active } });
  revalidatePath("/employees");
  return { ok: true };
}

const UpdateInfoInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).nullable(),
  address: z.string().trim().max(160).nullable(),
  address2: z.string().trim().max(160).nullable(),
  city: z.string().trim().max(80).nullable(),
  state: z.string().trim().max(40).nullable(),
  zip: z.string().trim().max(20).nullable(),
});

export async function updateEmployeeInfo(membershipId: string, raw: z.infer<typeof UpdateInfoInput>): Promise<EmployeeSaveResult> {
  const parsed = UpdateInfoInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const m = await prisma.membership.findFirst({ where: { id: membershipId, shopId }, select: { userId: true } });
  if (!m) return { ok: false, error: "Employee not found." };

  const { email, ...contact } = parsed.data;
  const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id: m.userId } }, select: { id: true } });
  if (emailTaken) return { ok: false, error: "That email is already in use." };

  await prisma.user.update({
    where: { id: m.userId },
    data: { email, ...contact },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${membershipId}`);
  return { ok: true };
}

const UpdateRoleInput = z.object({
  role: z.enum(["OWNER", "MANAGER", "SERVICE_WRITER", "TECHNICIAN"]),
  payrollType: z.enum(["SALARY", "FLAT_RATE", "HOURLY"]).nullable(),
  canPerformWork: z.boolean(),
  certificationNumber: z.string().trim().max(60).nullable(),
  accessTimes: z.string().trim().max(60),
});

export async function updateEmployeeRole(membershipId: string, raw: z.infer<typeof UpdateRoleInput>): Promise<EmployeeSaveResult> {
  const parsed = UpdateRoleInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const m = await prisma.membership.findFirst({
    where: { id: membershipId, shopId },
    select: {
      id: true,
      role: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!m) return { ok: false, error: "Employee not found." };

  if (m.role === "OWNER" && parsed.data.role !== "OWNER") {
    const owners = await prisma.membership.count({ where: { shopId, role: "OWNER", active: true } });
    if (owners <= 1) return { ok: false, error: "You can't change the role of the only owner." };
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      role: parsed.data.role,
      payrollType: parsed.data.payrollType,
      canPerformWork: parsed.data.canPerformWork,
      certificationNumber: parsed.data.certificationNumber,
      accessTimes: parsed.data.accessTimes,
      ...(parsed.data.role === "OWNER" ? { permissionGroup: null, permissionMode: "GROUP", permissions: [] } : {}),
    },
  });

  const employeeName = `${m.user.firstName} ${m.user.lastName}`.trim() || "Employee";
  if (m.role !== parsed.data.role) {
    await recordShopAuditEventSafe({
      shopId,
      eventType: ShopAuditEventType.EMPLOYEE_ROLE_CHANGED,
      summary: `${employeeName}: role changed from ${roleLabel(m.role)} to ${roleLabel(parsed.data.role)}`,
      metadata: {
        membershipId,
        previousRole: m.role,
        newRole: parsed.data.role,
      },
    });
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${membershipId}`);
  return { ok: true };
}

const SavePermissionsInput = z.object({
  permissionMode: z.enum(["GROUP", "INDIVIDUAL"]),
  permissionGroup: z.string().trim().max(60).nullable(),
  permissions: z.array(z.string()),
});

export async function saveEmployeePermissions(
  membershipId: string,
  raw: z.infer<typeof SavePermissionsInput>,
): Promise<EmployeeSaveResult> {
  const parsed = SavePermissionsInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesPermissions(shopId);
  if (denied) return denied;

  const m = await prisma.membership.findFirst({
    where: { id: membershipId, shopId },
    select: {
      id: true,
      role: true,
      permissionMode: true,
      permissionGroup: true,
      permissions: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!m) return { ok: false, error: "Employee not found." };
  if (m.role === "OWNER") return { ok: false, error: "Owners don't use permission groups." };

  const d = parsed.data;
  if (d.permissionMode === "GROUP" && !d.permissionGroup) {
    return { ok: false, error: "Select a permission group." };
  }

  const nextPermissions =
    d.permissionMode === "INDIVIDUAL" ? d.permissions.filter((k) => validKeys.has(k)) : [];

  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      permissionMode: d.permissionMode,
      permissionGroup: d.permissionMode === "GROUP" ? d.permissionGroup : null,
      permissions: nextPermissions,
    },
  });

  const employeeName = `${m.user.firstName} ${m.user.lastName}`.trim() || "Employee";
  const changed =
    m.permissionMode !== d.permissionMode ||
    m.permissionGroup !== (d.permissionMode === "GROUP" ? d.permissionGroup : null) ||
    JSON.stringify(m.permissions) !== JSON.stringify(nextPermissions);

  if (changed) {
    await recordShopAuditEventSafe({
      shopId,
      eventType: ShopAuditEventType.EMPLOYEE_ROLE_CHANGED,
      summary: `${employeeName}: permissions updated`,
      metadata: {
        membershipId,
        previousMode: m.permissionMode,
        permissionMode: d.permissionMode,
        permissionGroup: d.permissionMode === "GROUP" ? d.permissionGroup : null,
        permissionCount: nextPermissions.length,
      },
    });
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${membershipId}`);
  return { ok: true };
}

/** Bulk-assign a permission group to selected employees. */
export async function bulkAssignPermissionGroup(
  membershipIds: string[],
  permissionGroup: string,
): Promise<EmployeeSaveResult> {
  if (!permissionGroup) return { ok: false, error: "Select a permission group." };
  const shopId = await getShopId();
  const denied = await gates.employeesGroups(shopId);
  if (denied) return denied;

  const rows = await prisma.membership.findMany({
    where: { shopId, id: { in: membershipIds }, role: { not: "OWNER" } },
    select: { id: true },
  });
  if (rows.length === 0) return { ok: false, error: "No eligible employees selected." };
  await prisma.membership.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { permissionMode: "GROUP", permissionGroup, permissions: [] },
  });

  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.EMPLOYEE_ROLE_CHANGED,
    summary: `Assigned permission group "${permissionGroup}" to ${rows.length} employee(s)`,
    metadata: {
      membershipIds: rows.map((r) => r.id),
      permissionGroup,
    },
  });

  revalidatePath("/employees");
  return { ok: true };
}
