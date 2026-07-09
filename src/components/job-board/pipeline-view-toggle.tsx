"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Columns3, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Switch between kanban job board and split workflow view. */
export function PipelineViewToggle({ className }: { className?: string }) {
  const pathname = usePathname();
  const onWorkflow = pathname === "/workflow";

  return (
    <div className={cn("inline-flex rounded-md border bg-card p-0.5", className)}>
      <Button
        asChild
        variant={onWorkflow ? "ghost" : "default"}
        size="sm"
        className={cn("h-8 gap-1.5", !onWorkflow && "bg-brand-navy text-white hover:bg-brand-navy/90")}
      >
        <Link href="/job-board">
          <Columns3 className="size-4" />
          Board
        </Link>
      </Button>
      <Button
        asChild
        variant={onWorkflow ? "default" : "ghost"}
        size="sm"
        className={cn("h-8 gap-1.5", onWorkflow && "bg-brand-navy text-white hover:bg-brand-navy/90")}
      >
        <Link href="/workflow">
          <LayoutGrid className="size-4" />
          Split
        </Link>
      </Button>
    </div>
  );
}
