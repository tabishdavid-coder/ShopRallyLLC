import "server-only";

import { requireAnyPermission, requirePermission } from "@/server/permissions";

export type GateResult = { ok: false; error: string } | null;

async function gate(shopId: string, key: string): Promise<GateResult> {
  const perm = await requirePermission(shopId, key);
  return perm.ok ? null : perm;
}

async function gateAny(shopId: string, keys: string[]): Promise<GateResult> {
  const perm = await requireAnyPermission(shopId, keys);
  return perm.ok ? null : perm;
}

/** Typed permission gate helpers for server actions. Return null when allowed. */
export const gates = {
  customersView: (shopId: string) => gate(shopId, "customers.view"),
  customersMessage: (shopId: string) => gate(shopId, "customers.message"),
  customersExport: (shopId: string) => gate(shopId, "customers.export"),
  customersChangeTech: (shopId: string) => gate(shopId, "customers.change_tech"),
  customersUnpostRo: (shopId: string) => gate(shopId, "customers.unpost_ro"),
  jobBoardView: (shopId: string) =>
    gateAny(shopId, ["job_board.view", "job_board.view_all"]),
  jobBoardDelete: (shopId: string) => gate(shopId, "job_board.delete"),
  estimateView: (shopId: string) => gate(shopId, "estimate.view"),
  estimateEdit: (shopId: string) => gate(shopId, "estimate.edit"),
  employeesManage: (shopId: string) => gate(shopId, "employees.manage"),
  employeesPermissions: (shopId: string) => gate(shopId, "employees.permissions"),
  employeesGroups: (shopId: string) => gate(shopId, "employees.groups"),
  /** Read shop email readiness for Share / customer email (not settings write). */
  emailSendStatus: (shopId: string) =>
    gateAny(shopId, [
      "estimate.approve",
      "payments.collect",
      "customers.message",
      "employees.manage",
    ]),
  vendorsManage: (shopId: string) => gate(shopId, "vendors.manage"),
  financeAccount: (shopId: string) => gate(shopId, "finance.account"),
  ordersManage: (shopId: string) => gate(shopId, "orders.manage"),
  paymentsCollect: (shopId: string) => gate(shopId, "payments.collect"),
  cannedJobsManage: (shopId: string) => gate(shopId, "canned_jobs.manage"),
  inspectionsManage: (shopId: string) => gate(shopId, "inspections.manage"),
  inventoryEdit: (shopId: string) =>
    gateAny(shopId, ["inventory.edit", "inventory.view"]),
  inventoryDelete: (shopId: string) => gate(shopId, "inventory.delete"),
};
