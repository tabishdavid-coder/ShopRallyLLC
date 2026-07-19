"use client";

import { useEffect } from "react";

import { markEstimateViewedByToken } from "@/server/actions/estimate-events";

/** Fire-and-forget first-view tracking from the public approval page (server action). */
export function ApproveViewTracker({ token }: { token: string }) {
  useEffect(() => {
    void markEstimateViewedByToken(token);
  }, [token]);

  return null;
}
