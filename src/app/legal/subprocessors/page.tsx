import Link from "next/link";

import { SUBPROCESSORS } from "@/lib/legal-subprocessors";

export const metadata = { title: "Subprocessors — ShopRally" };

export default function SubprocessorsPage() {
  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-red">
          ShopRally Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy">Subprocessors</h1>
        <p className="text-sm text-muted-foreground">
          Third-party service providers that process data on behalf of ShopRally and our shop
          customers. This list supplements our{" "}
          <Link href="/legal/privacy" className="font-medium text-brand-navy hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/legal/dpa" className="font-medium text-brand-navy hover:underline">
            Data Processing Agreement
          </Link>
          .
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Purpose</th>
              <th className="px-4 py-3 font-medium">Data processed</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((row) => (
              <tr key={row.vendor} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">{row.vendor}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.dataProcessed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Last updated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
        We will notify customers of material changes to this list via email or in-app notice.
      </p>
    </article>
  );
}
