import { redirect } from "next/navigation";

import { defaultRoOpenHref } from "@/lib/ro-workspace";

/** Legacy split-view URL — route cards to the estimate builder; board-only links to job board. */
export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ ro?: string; q?: string }>;
}) {
  const sp = await searchParams;

  if (sp.ro) {
    redirect(defaultRoOpenHref(sp.ro));
  }

  const q = sp.q ? `?q=${encodeURIComponent(sp.q)}` : "";
  redirect(`/job-board${q}`);
}
