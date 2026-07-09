import { ChevronDown } from "lucide-react";

import {
  PLANS,
  WEB_PRESENCE_LAUNCH_SETUP,
  WEB_PRESENCE_SERVICES,
  formatWebPresenceSetupCents,
  webPresenceSetupFootnote,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Collapsed disclosure — launch setup fees live here, not on CRM plan cards. */
export function WebPresenceLaunchSetupDetails({ className }: { className?: string }) {
  const shopsite = WEB_PRESENCE_SERVICES.find((s) => s.id === "shopsite-monthly");
  const seo = WEB_PRESENCE_SERVICES.find((s) => s.id === "seo-monthly");
  const bundle = WEB_PRESENCE_SERVICES.find((s) => s.id === "web-seo-bundle-monthly");

  return (
    <details
      className={cn(
        "group mx-auto max-w-2xl rounded-xl border border-brand-navy/10 bg-slate-50/80 text-left",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-brand-navy [&::-webkit-details-marker]:hidden">
        <span>What is launch setup? (one-time, only for ShopSite &amp; Local SEO)</span>
        <ChevronDown className="size-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-brand-navy/8 px-4 py-4 text-sm text-slate-600">
        <p>
          Your CRM plan has <strong className="font-semibold text-brand-navy">no setup fee</strong>. Launch
          setup is a one-time charge when we build and configure ShopSite or Local SEO for the first time —
          then you pay the monthly rate only.
        </p>
        <ul className="space-y-3">
          {shopsite ? (
            <li>
              <p className="font-semibold text-brand-navy">
                ShopSite — {formatWebPresenceSetupCents(shopsite.setupCents)} launch setup
              </p>
              <ul className="mt-1 list-inside list-disc text-slate-600">
                {WEB_PRESENCE_LAUNCH_SETUP.shopsite.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">Then {shopsite.priceLabel}</p>
            </li>
          ) : null}
          {seo ? (
            <li>
              <p className="font-semibold text-brand-navy">
                Local SEO — {formatWebPresenceSetupCents(seo.setupCents)} launch setup
              </p>
              <ul className="mt-1 list-inside list-disc text-slate-600">
                {WEB_PRESENCE_LAUNCH_SETUP.seo.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">Then {seo.priceLabel}</p>
            </li>
          ) : null}
          {bundle ? (
            <li>
              <p className="font-semibold text-brand-navy">
                Bundle — {formatWebPresenceSetupCents(bundle.setupCents)} launch setup
              </p>
              <ul className="mt-1 list-inside list-disc text-slate-600">
                {WEB_PRESENCE_LAUNCH_SETUP.bundle.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {WEB_PRESENCE_LAUNCH_SETUP.bundle.savingsNote ? (
                <p className="mt-1 text-xs font-medium text-brand-navy/80">
                  {WEB_PRESENCE_LAUNCH_SETUP.bundle.savingsNote}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">Then {bundle.priceLabel}</p>
            </li>
          ) : null}
        </ul>
        <p className="text-xs text-slate-500">
          {PLANS.ENTERPRISE.name} includes ShopSite, Local SEO, and launch setup — no separate launch
          charge.
        </p>
      </div>
    </details>
  );
}

/** Muted line under monthly price on web presence cards. */
export function WebPresenceSetupLine({ setupCents }: { setupCents: number }) {
  return <p className="mt-1 text-xs text-slate-500">{webPresenceSetupFootnote(setupCents)}</p>;
}
