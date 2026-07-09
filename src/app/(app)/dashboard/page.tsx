import { redirect } from "next/navigation";

/** Dashboard sidebar + logo home → daily snapshot. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const sp = await searchParams;
  if (sp.access === "denied") {
    redirect("/dashboard/snapshot?access=denied");
  }
  redirect("/dashboard/snapshot");
}
