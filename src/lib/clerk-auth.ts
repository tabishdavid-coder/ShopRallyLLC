import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import type { PlatformUser } from "@/lib/platform";
import { getPlatformAdminEmails } from "@/lib/platform";

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
  );
}

/** Resolve signed-in Clerk user into our PlatformUser shape, or null when unauthenticated. */
export async function getClerkPlatformUser(): Promise<PlatformUser | null> {
  if (!isClerkConfigured()) return null;

  try {
    const user = await currentUser();
    if (!user) return null;

    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "";

    const allowed = getPlatformAdminEmails();
    const isPlatformAdmin = allowed.includes(email.toLowerCase());

    return {
      id: user.id,
      email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phoneNumbers[0]?.phoneNumber ?? null,
      isPlatformAdmin,
    };
  } catch {
    return null;
  }
}
