import "server-only";

import { prisma } from "@/db/client";
import { getClerkPlatformUser } from "@/lib/clerk-auth";

export type PlatformUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isPlatformAdmin: boolean;
};

const DEFAULT_PLATFORM_ADMIN_EMAIL = "platform@getshoprally.com";

/** Comma-separated list from PLATFORM_ADMIN_EMAILS, with legacy PLATFORM_ADMIN_EMAIL fallback. */
export function getPlatformAdminEmails(): string[] {
  const list = process.env.PLATFORM_ADMIN_EMAILS?.trim();
  if (list) {
    return list
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  const single = process.env.PLATFORM_ADMIN_EMAIL?.trim() || DEFAULT_PLATFORM_ADMIN_EMAIL;
  return [single.toLowerCase()];
}

/**
 * Resolve the signed-in user. Uses Clerk when configured (M1b), otherwise the
 * seeded platform admin / dev stub.
 */
export async function getCurrentUser(): Promise<PlatformUser> {
  const clerkUser = await getClerkPlatformUser();
  if (clerkUser) return clerkUser;

  const email =
    process.env.PLATFORM_ADMIN_EMAIL?.trim() || DEFAULT_PLATFORM_ADMIN_EMAIL;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isPlatformAdmin: true,
      },
    });

    if (user) return user;
  } catch {
    // Neon cold-start / transient outages — keep dev shell usable.
    if (process.env.NODE_ENV === "development") {
      return {
        id: "stub-platform-admin",
        email,
        firstName: "Platform",
        lastName: "Admin",
        phone: null,
        isPlatformAdmin: true,
      };
    }
    throw new Error("Unable to load user context.");
  }

  // Dev fallback when DB is empty — platform routes still need a principal.
  return {
    id: "stub-platform-admin",
    email,
    firstName: "Platform",
    lastName: "Admin",
    phone: null,
    isPlatformAdmin: true,
  };
}

export async function isPlatformAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (user.id === "stub-platform-admin") return true;
  if (user.isPlatformAdmin) return true;
  const allowed = getPlatformAdminEmails();
  if (allowed.includes(user.email.toLowerCase())) return true;
  return false;
}

export class PlatformAccessError extends Error {
  constructor(message = "Platform admin access required.") {
    super(message);
    this.name = "PlatformAccessError";
  }
}

/** Server guard for platform routes and actions. Throws when access is denied. */
export async function requirePlatformAdmin(): Promise<PlatformUser> {
  const user = await getCurrentUser();
  if (!(await isPlatformAdmin())) {
    throw new PlatformAccessError();
  }
  return user;
}

export type PlatformContext = {
  user: PlatformUser;
  isPlatformAdmin: boolean;
  platformId: string | null;
};

/** Platform-scoped context for master admin routes. */
export async function getPlatformContext(): Promise<PlatformContext> {
  const user = await getCurrentUser();
  const admin = await isPlatformAdmin();

  if (!admin) {
    return { user, isPlatformAdmin: false, platformId: null };
  }

  const platform = await prisma.platform.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return {
    user,
    isPlatformAdmin: true,
    platformId: platform?.id ?? null,
  };
}

export function platformUserDisplayName(user: PlatformUser): string {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}
