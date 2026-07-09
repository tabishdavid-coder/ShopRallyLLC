import Link from "next/link";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";

const FOOTER_LINKS = {
  Product: [
    { href: "/features", label: "Shop management" },
    { href: "/features", label: "Growth Engine" },
    { href: "/pricing", label: "Pricing" },
    { href: "/launch", label: "Join waitlist" },
    { href: "/demo", label: "Book a demo" },
  ],
  Company: [
    { href: "/login", label: "Sign in" },
    { href: "/login?portal=platform", label: "Platform admin" },
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
              Cloud shop management for independent repair shops — CRM, Growth Engine, and optional
              monthly ShopSite &amp; Local SEO subscriptions.
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
          <p>Built for shops that fix cars — and run a real business.</p>
        </div>
      </div>
    </footer>
  );
}
