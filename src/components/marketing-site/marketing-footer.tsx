import Link from "next/link";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/support";

const preLaunch = MARKETING_LAUNCH.preLaunch;

const FOOTER_LINKS = {
  Product: [
    { href: "/features", label: "What's included" },
    { href: "/pricing", label: "Ignition pricing" },
    { href: marketingPrimaryHref(preLaunch), label: marketingPrimaryCta({ preLaunch }) },
    { href: marketingSecondaryHref(preLaunch), label: marketingSecondaryCta(preLaunch) },
  ],
  Company: [
    { href: "/login", label: "Sign in" },
    { href: "/launch", label: "Founding shops" },
  ],
  Legal: [
    { href: "/legal/terms", label: "Terms" },
    { href: "/legal/privacy", label: "Privacy" },
    { href: "/legal/aup", label: "Acceptable use" },
  ],
} as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-brand-navy/10 bg-brand-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <ShopRallyLogo href="/" variant="onDark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              {preLaunch
                ? "Cloud shop CRM for independent repair shops. Ignition launches Q4 2026 with PartsTech included — founding seats open now. Pro and Elite come later."
                : "Cloud shop CRM for independent repair shops — Ignition runs the bay with PartsTech included. Pro and Elite come later."}
            </p>
          </div>

          {(Object.entries(FOOTER_LINKS) as [keyof typeof FOOTER_LINKS, (typeof FOOTER_LINKS)[keyof typeof FOOTER_LINKS]][]).map(
            ([title, links]) => (
              <div key={title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
                  {title}
                </p>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/75 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ShopRally. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Built for shops that fix cars — and run a real business.</span>
            <a
              href={`mailto:${PLATFORM_CONTACT_EMAIL}`}
              className="text-white/70 transition-colors hover:text-white"
            >
              {PLATFORM_CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
