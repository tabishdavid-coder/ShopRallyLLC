"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

/** One-shot banner when layout redirects to dashboard for missing permissions. */
export function CrmAccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) &&
      searchParams.get("access") === "denied"
    ) {
      setVisible(true);
    }
  }, [pathname, searchParams]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    router.replace("/dashboard/snapshot", { scroll: false });
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950"
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">You don&apos;t have access to that page</p>
        <p className="text-xs text-amber-900/80">
          Your role doesn&apos;t include that permission. Ask a shop admin to update your access in
          Employees → Permissions.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-xs font-medium text-amber-900 underline-offset-2 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
