import { redirect } from "next/navigation";

/** RO list lives on the job board — keep /repair-orders links working (incl. ?design=open). */
export default async function RepairOrdersIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const suffix = qs.toString();
  redirect(suffix ? `/job-board?${suffix}` : "/job-board");
}
