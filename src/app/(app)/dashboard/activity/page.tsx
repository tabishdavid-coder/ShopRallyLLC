import { redirect } from "next/navigation";

/** Legacy path — Shop Activity lives at `/dashboard/shop-activity`. */
export default async function DashboardActivityRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    }
  }
  const suffix = qs.toString();
  redirect(suffix ? `/dashboard/shop-activity?${suffix}` : "/dashboard/shop-activity");
}
