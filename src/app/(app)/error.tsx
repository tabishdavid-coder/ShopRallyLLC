"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const dbDown =
    error.message.includes("Can't reach database") ||
    error.message.includes("P1001") ||
    error.message.includes("connection");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand-red/10">
        <AlertTriangle className="size-6 text-brand-red" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold">
          {dbDown ? "Database connection lost" : "This page couldn't load"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dbDown
            ? "ShopRally couldn't reach the local database. Start Prisma Dev with npm run db:dev, then restart npm run dev."
            : "A server error occurred while loading this page."}
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Error ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => reset()}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
      {dbDown ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          Fix: Terminal 1 —{" "}
          <code className="rounded bg-muted px-1 py-0.5">npm run db:dev</code> · Terminal 2 —{" "}
          <code className="rounded bg-muted px-1 py-0.5">npm run dev</code>
        </p>
      ) : null}
    </div>
  );
}
