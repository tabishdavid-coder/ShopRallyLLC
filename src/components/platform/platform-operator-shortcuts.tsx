import Link from "next/link";
import {
  Building2,
  CreditCard,
  Globe,
  LifeBuoy,
  Megaphone,
  Radar,
  Rocket,
  Scale,
  ServerCog,
} from "lucide-react";

import { MASTER_CRM_HOME } from "@/lib/platform-routing";
import { cn } from "@/lib/utils";

const shortcuts = [
  {
    title: "Shops",
    description: "Tenants, plans, health, enter Shop CRM",
    href: `${MASTER_CRM_HOME}/shops`,
    icon: Building2,
  },
  {
    title: "Onboarding",
    description: "Pipeline, approvals, go-live checklist",
    href: `${MASTER_CRM_HOME}/onboarding`,
    icon: Rocket,
  },
  {
    title: "Customer websites",
    description: "ShopSite builds, launch, and upkeep",
    href: `${MASTER_CRM_HOME}/websites`,
    icon: Globe,
  },
  {
    title: "Billing",
    description: "Plans, MRR snapshot, subscription status",
    href: `${MASTER_CRM_HOME}/billing`,
    icon: CreditCard,
  },
  {
    title: "Sales leads",
    description: "Waitlist and inbound pipeline",
    href: `${MASTER_CRM_HOME}/leads`,
    icon: Megaphone,
  },
  {
    title: "Support",
    description: "Cross-shop tickets and inbox",
    href: `${MASTER_CRM_HOME}/support`,
    icon: LifeBuoy,
  },
  {
    title: "Legal",
    description: "MSA, compliance, audit trail",
    href: `${MASTER_CRM_HOME}/legal`,
    icon: Scale,
  },
  {
    title: "SEO Autopilot",
    description: "Platform SEO tooling and health",
    href: `${MASTER_CRM_HOME}/seo-automation`,
    icon: Radar,
  },
  {
    title: "System",
    description: "Integrations, env health, retention",
    href: `${MASTER_CRM_HOME}/system`,
    icon: ServerCog,
  },
];

/** Operator quick links — Master CRM hub navigation. */
export function PlatformOperatorShortcuts({ className }: { className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-sm font-semibold text-brand-navy">Operator shortcuts</h2>
        <p className="text-xs text-muted-foreground">
          Jump to Master CRM modules — tenant day-to-day work stays in Shop CRM.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:border-brand-light/60 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-brand-navy">
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="text-sm font-semibold">{item.title}</span>
                </div>
                <p className="mt-1.5 flex-1 text-xs text-muted-foreground">{item.description}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
