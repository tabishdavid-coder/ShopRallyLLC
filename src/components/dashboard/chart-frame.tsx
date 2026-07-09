import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ChartFrame({
  children,
  height,
  className,
}: {
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full min-w-0", className)}
      style={height != null ? { height } : undefined}
    >
      {children}
    </div>
  );
}
