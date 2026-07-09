import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Shop access — ShopRally" };

export default function ShopAccessPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <ShieldAlert className="size-10 text-brand-red" aria-hidden />
      <h1 className="text-xl font-bold text-brand-navy">No shop access</h1>
      <p className="text-sm text-muted-foreground">
        Your account isn&apos;t linked to an active shop membership, or the selected organization
        isn&apos;t set up yet. Switch to a valid shop in the header, or contact your shop admin.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/support">Help &amp; support</Link>
        </Button>
      </div>
    </div>
  );
}
