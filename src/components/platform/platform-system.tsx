import Link from "next/link";
import {
  Activity,
  Building2,
  Flag,
  Mail,
  MessageSquare,
  Server,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";

const sections = [
  {
    title: "Platform health",
    icon: Activity,
    items: [
      { label: "App status", value: "Operational", tone: "ok" as const },
      { label: "Database", value: "Neon Postgres connected", tone: "ok" as const },
      { label: "Background jobs", value: "Inngest — not configured", tone: "warn" as const },
    ],
  },
  {
    title: "Feature flags",
    icon: Flag,
    items: [
      { label: "SMS platform", value: process.env.SMS_ENABLED !== "false" ? "Enabled" : "Disabled", tone: "ok" as const },
      { label: "Stripe billing", value: process.env.STRIPE_SECRET_KEY ? "Configured" : "Stub mode", tone: "warn" as const },
      { label: "Clerk auth", value: process.env.CLERK_SECRET_KEY ? "Configured" : "Stub user", tone: "warn" as const },
    ],
  },
  {
    title: "Messaging & email",
    icon: MessageSquare,
    items: [
      { label: "Twilio SMS", value: process.env.TWILIO_ACCOUNT_SID ? "Live credentials" : "Mock mode", tone: "warn" as const },
      {
        label: "Outbound email",
        value: (() => {
          const key = process.env.RESEND_API_KEY?.trim() ?? "";
          if (!key) return "Mailto fallback (no RESEND_API_KEY)";
          if (key === "[SENSITIVE]" || !key.startsWith("re_")) {
            return "Resend key invalid/placeholder — set re_… in Vercel";
          }
          const from = process.env.EMAIL_FROM?.trim() ?? "";
          const fromOk = from.includes("@") && from !== "[SENSITIVE]";
          return fromOk
            ? "Resend configured"
            : "Resend key OK — EMAIL_FROM missing (using onboarding@resend.dev)";
        })(),
        tone: "warn" as const,
      },
    ],
  },
];

export function PlatformSystem() {
  return (
    <div className="space-y-8">
      <PlatformPageIntro
        title="System"
        description="Platform-wide health, integrations, and maintenance. Tenant operations (customers, ROs) live in Shop CRM — enter from Shops."
      >
        <Button asChild variant="outline" size="sm" className="border-brand-navy/30">
          <Link href={`${MASTER_CRM_HOME}/legal`}>
            <Shield className="mr-1.5 size-3.5" />
            Compliance & audit
          </Link>
        </Button>
      </PlatformPageIntro>

      <div className="grid gap-6 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <section.icon className="size-4 text-brand-navy" />
              <h3 className="font-semibold text-brand-navy">{section.title}</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {section.items.map((item) => (
                <li key={item.label} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span
                    className={
                      item.tone === "ok"
                        ? "font-medium text-emerald-700"
                        : "font-medium text-amber-700"
                    }
                  >
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-dashed bg-muted/30 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-navy/10">
            <Server className="size-5 text-brand-navy" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-brand-navy">Maintenance tools (coming soon)</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cache flush, seed re-run guards, and broadcast banners will live here. Per-shop{" "}
              <strong className="font-medium text-foreground">release flags</strong> are on each
              shop detail page (Platform → Shops → shop). See{" "}
              <code className="text-xs">docs/PHASED-ROLLOUT.md</code>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`${MASTER_CRM_HOME}/shops`}>
                  <Shield className="mr-1.5 size-3.5" />
                  Release flags (per shop)
                </Link>
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Mail className="mr-1.5 size-3.5" />
                Email templates
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`${MASTER_CRM_HOME}/shops`}>
                  <Building2 className="mr-1.5 size-3.5" />
                  Manage shops
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
