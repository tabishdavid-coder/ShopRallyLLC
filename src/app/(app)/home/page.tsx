import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/platform";
import { appHomePath } from "@/lib/platform-routing";

/** Canonical app home — platform admins land on Master CRM; shop staff on dashboard. */
export default async function HomeRedirect({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const platformAdmin = await isPlatformAdmin();
  redirect(appHomePath(platformAdmin, range));
}
