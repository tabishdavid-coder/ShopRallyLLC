import "server-only";

import { prisma } from "@/db/client";
import { resolvePermissions } from "@/lib/permissions";
import { getCurrentUser, isPlatformAdmin } from "@/lib/platform";

export type PermissionResult = { ok: true } | { ok: false; error: string };

/** Effective permission keys for the current user in a shop, or `"all"` when unrestricted. */
export async function getEffectivePermissions(
  shopId: string,
): Promise<string[] | "all"> {
  if (await isPlatformAdmin()) return "all";

  const user = await getCurrentUser();
  const membership = await prisma.membership.findFirst({
    where: { shopId, userId: user.id, active: true },
    select: {
      role: true,
      permissionMode: true,
      permissionGroup: true,
      permissions: true,
    },
  });

  if (!membership) return [];
  if (membership.role === "OWNER") return "all";

  const individual = Array.isArray(membership.permissions)
    ? (membership.permissions as string[])
    : [];

  return resolvePermissions(
    membership.permissionMode,
    membership.permissionGroup,
    individual,
  );
}

function hasPermission(effective: string[] | "all", key: string): boolean {
  if (effective === "all") return true;
  return effective.includes(key);
}

export async function requirePermission(
  shopId: string,
  key: string,
): Promise<PermissionResult> {
  const effective = await getEffectivePermissions(shopId);
  if (hasPermission(effective, key)) return { ok: true };
  return { ok: false, error: "You don't have permission to perform this action." };
}

export async function requireAnyPermission(
  shopId: string,
  keys: string[],
): Promise<PermissionResult> {
  const effective = await getEffectivePermissions(shopId);
  if (effective === "all") return { ok: true };
  if (keys.some((k) => effective.includes(k))) return { ok: true };
  return { ok: false, error: "You don't have permission to perform this action." };
}

/** Job board drag: approving work requires estimate.approve; otherwise job_board.view. */
export async function requireJobBoardMove(
  shopId: string,
  opts: { authorizesWork?: boolean },
): Promise<PermissionResult> {
  if (opts.authorizesWork) {
    return requirePermission(shopId, "estimate.approve");
  }
  return requireAnyPermission(shopId, ["job_board.view", "job_board.view_all"]);
}
