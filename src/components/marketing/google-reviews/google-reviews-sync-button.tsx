"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { syncGoogleReviews } from "@/server/actions/google-reviews";

export function GoogleReviewsSyncButton({
  prominent,
  onMessage,
}: {
  prominent?: boolean;
  onMessage?: (message: string) => void;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size={prominent ? "default" : "sm"}
      variant={prominent ? "default" : "outline"}
      className="gap-1.5"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await syncGoogleReviews();
          if (res.ok && res.message) onMessage?.(res.message);
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
      Sync reviews
    </Button>
  );
}
