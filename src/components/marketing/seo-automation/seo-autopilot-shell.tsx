"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Radar } from "lucide-react";

import { GROWTH_BUNDLES, GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { SeoAutopilotSubnav } from "@/components/marketing/seo-automation/seo-autopilot-subnav";

export function SeoAutopilotShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const connected = searchParams.get("gsc_connected");
    const gscError = searchParams.get("gsc_error");
    const gscMessage = searchParams.get("gsc_message");

    if (connected === "1") {
      setNotice({
        type: "success",
        text: gscMessage ?? "Search Console connected.",
      });
    } else if (gscError) {
      setNotice({ type: "error", text: gscError });
    } else {
      setNotice(null);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("gsc_connected");
    url.searchParams.delete("gsc_message");
    url.searchParams.delete("gsc_error");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/85 px-6 py-7 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <Radar className="mt-0.5 size-8 shrink-0 text-brand-light" />
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">{GROWTH_PRODUCTS.seoAutopilot.label}</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">{GROWTH_BUNDLES.autopilot.tagline}</p>
          </div>
        </div>
      </div>

      {notice?.type === "error" ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {notice.text}
        </p>
      ) : null}
      {notice?.type === "success" ? (
        <p className="rounded-lg border border-brand-light/40 bg-brand-light/10 px-4 py-3 text-sm text-brand-navy">
          {notice.text}
        </p>
      ) : null}

      <SeoAutopilotSubnav />
      {children}
    </div>
  );
}
