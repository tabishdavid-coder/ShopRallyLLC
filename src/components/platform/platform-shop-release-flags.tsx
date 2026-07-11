"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Flag, Loader2 } from "lucide-react";

import { updateShopReleaseFlags } from "@/server/actions/platform";
import {
  RELEASE_MODULE_LABELS,
  RELEASE_MODULES,
  type ReleaseFlagMap,
  type ReleaseModule,
} from "@/lib/release-flags";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

function effectiveOn(
  module: ReleaseModule,
  flags: ReleaseFlagMap,
  defaultOpen: boolean,
): boolean {
  if (flags[module] === false) return false;
  if (flags[module] === true) return true;
  return defaultOpen;
}

export function PlatformShopReleaseFlags({
  shopId,
  releaseFlags,
  releaseFlagsDefaultOpen,
}: {
  shopId: string;
  releaseFlags: ReleaseFlagMap;
  releaseFlagsDefaultOpen: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyModule, setBusyModule] = useState<ReleaseModule | null>(null);
  const [local, setLocal] = useState<ReleaseFlagMap>(releaseFlags);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setLocal(releaseFlags);
  }, [releaseFlags]);

  function onToggle(module: ReleaseModule, next: boolean) {
    setBusyModule(module);
    setMessage(null);
    setLocal((prev) => ({ ...prev, [module]: next }));
    startTransition(async () => {
      const res = await updateShopReleaseFlags(shopId, { [module]: next });
      setBusyModule(null);
      if (!res.ok) {
        setLocal(releaseFlags);
        setMessage({ kind: "err", text: res.error });
        return;
      }
      setMessage({
        kind: "ok",
        text: next
          ? `${RELEASE_MODULE_LABELS[module]} released for this shop`
          : `${RELEASE_MODULE_LABELS[module]} turned off for this shop`,
      });
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10">
          <Flag className="size-4 text-brand-navy" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-brand-navy">Release flags</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Deploy ≠ release. Modules stay dark until you flip them on for this shop.
            Default when unset:{" "}
            <span className="font-medium text-foreground">
              {releaseFlagsDefaultOpen ? "ON (local/preview)" : "OFF (production)"}
            </span>
            . Plan entitlement still applies.
          </p>
        </div>
      </div>

      {message ? (
        <p
          className={
            message.kind === "ok"
              ? "mt-3 text-sm text-emerald-700"
              : "mt-3 text-sm text-destructive"
          }
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <ul className="mt-4 divide-y rounded-lg border">
        {RELEASE_MODULES.map((module) => {
          const on = effectiveOn(module, local, releaseFlagsDefaultOpen);
          const explicit = local[module];
          const saving = pending && busyModule === module;
          return (
            <li
              key={module}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <Label htmlFor={`release-${module}`} className="font-medium text-foreground">
                  {RELEASE_MODULE_LABELS[module]}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {explicit === true
                    ? "Explicitly ON"
                    : explicit === false
                      ? "Explicitly OFF"
                      : `Unset → default ${releaseFlagsDefaultOpen ? "ON" : "OFF"}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : null}
                <Checkbox
                  id={`release-${module}`}
                  checked={on}
                  disabled={pending}
                  onCheckedChange={(v) => onToggle(module, v === true)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
