"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import { isDesignModeEnabled } from "@/lib/design-mode-tokens";
import { cn } from "@/lib/utils";

/** Floating create-RO action — stacks above dev design dock when both are visible. */
export function CreateRoFab() {
  const pathname = usePathname();
  const designDockVisible = isDesignModeEnabled();
  const { openIntake, config } = useRoIntakeOptional();

  if (pathname === "/repair-orders/new" || pathname.startsWith("/workflow")) {
    return null;
  }

  return (
    <div
      data-planned-change="INTAKE-01"
      className={cn(
        "fixed left-5 z-[71]",
        designDockVisible ? "bottom-[4.75rem]" : "bottom-5",
      )}
    >
      {config ? (
        <Button
          type="button"
          size="icon"
          className="size-12 rounded-full bg-brand-light text-brand-navy shadow-lg hover:bg-brand-light/90"
          aria-label="New Repair Order"
          title="New Repair Order"
          onClick={() => openIntake()}
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </Button>
      ) : (
        <Button
          asChild
          size="icon"
          className="size-12 rounded-full bg-brand-light text-brand-navy shadow-lg hover:bg-brand-light/90"
          aria-label="New Repair Order"
          title="New Repair Order"
        >
          <Link href="/repair-orders/new">
            <Plus className="size-5" strokeWidth={2.5} />
          </Link>
        </Button>
      )}
    </div>
  );
}
