"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Droplets,
  Gift,
  Megaphone,
  Star,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaigns";
import { cn } from "@/lib/utils";
import { createCampaignFromTemplate } from "@/server/actions/campaigns";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const ICONS = {
  star: Star,
  calendar: Calendar,
  alert: AlertTriangle,
  gift: Gift,
  users: Users,
  droplet: Droplets,
  megaphone: Megaphone,
} as const;

export function CampaignTemplateCards({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function useTemplate(template: CampaignTemplate) {
    startTransition(async () => {
      const result = await createCampaignFromTemplate(template.type);
      if (result.ok && result.data?.id) {
        router.push(`/marketing/campaigns/${result.data.id}?edit=1`);
      }
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {CAMPAIGN_TEMPLATES.map((template) => {
        const Icon = ICONS[template.icon];
        return (
          <Card key={template.type} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-brand-light/30 p-2">
                    <Icon className="size-4 text-brand-navy" />
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                {template.automated ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                    Automated
                  </Badge>
                ) : null}
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              {template.automationNote ? (
                <p className="text-xs text-muted-foreground">{template.automationNote}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {template.type === "WIN_BACK" ? (
                  <Button asChild size="sm" className="bg-brand-navy hover:bg-brand-navy/90" disabled={disabled}>
                    <Link href="/marketing/campaigns/winback">Open win-back</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-brand-navy hover:bg-brand-navy/90"
                    disabled={disabled || pending}
                    onClick={() => useTemplate(template)}
                  >
                    Use template
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" disabled={disabled}>
                  <Link
                    href={
                      template.type === "WIN_BACK"
                        ? "/marketing/campaigns/winback"
                        : `/marketing/campaigns/new?type=${template.type}`
                    }
                  >
                    Customize
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    SCHEDULED: "bg-blue-100 text-blue-800",
    ACTIVE: "bg-emerald-100 text-emerald-800",
    PAUSED: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-slate-100 text-slate-700",
  };
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    ACTIVE: "Active",
    PAUSED: "Paused",
    COMPLETED: "Completed",
  };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
        styles[status] ?? styles.DRAFT,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
