"use client";

import { useEffect, useState } from "react";

import { timeAgo } from "@/lib/datetime";

/** Client-only relative time to avoid SSR/client clock drift hydration errors. */
export function RelativeTime({
  date,
  prefix = "",
}: {
  date: Date | string;
  prefix?: string;
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => setLabel(timeAgo(date));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [date]);

  return (
    <span suppressHydrationWarning>
      {prefix}
      {label || "\u00A0"}
    </span>
  );
}
