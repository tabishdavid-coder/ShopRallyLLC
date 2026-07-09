import { redirect } from "next/navigation";

/** Legacy customer detail URL — opens drawer on the customers list instead. */
export default async function CustomerDetailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams({ customer: id });
  if (sp.tab) qs.set("tab", sp.tab);
  redirect(`/customers?${qs.toString()}`);
}
