"use client";

import { useEffect } from "react";

/** Marks the document while an estimate workspace is mounted (portaled menus/dialogs). */
export function EstimateWorkspaceScope() {
  useEffect(() => {
    document.documentElement.dataset.estimateWorkspace = "";
    return () => {
      delete document.documentElement.dataset.estimateWorkspace;
    };
  }, []);
  return null;
}
