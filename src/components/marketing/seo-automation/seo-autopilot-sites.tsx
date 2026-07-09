"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  Pause,
  Play,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { needsGa4GoogleReconnect } from "@/lib/seo-ga4-reconnect";
import { PLANS } from "@/lib/plans";
import { GoogleSearchConsoleConnectButton } from "@/components/marketing/seo-automation/gsc-connect-button";
import { SeoGoogleReconnectBanner } from "@/components/marketing/seo-automation/seo-google-reconnect-banner";
import { useSeoAutopilot } from "@/components/marketing/seo-automation/seo-autopilot-context";
import {
  SOURCE_LABEL,
  formatWhen,
  scoreClass,
  statusBadge,
} from "@/components/marketing/seo-automation/seo-autopilot-utils";
import {
  disconnectGoogleSearchConsole,
  linkSeoPropertyToGsc,
} from "@/server/actions/google-search-console";
import {
  addExternalSeoSite,
  pauseSeoProperty,
  resumeSeoProperty,
  runSeoAuditNow,
  runSeoContentNow,
  saveShopCustomDomain,
  updateSeoAutopilotSettings,
  verifySeoProperty,
} from "@/server/actions/seo-automation";

function GscPropertyLinker({
  propertyId,
  sites,
  disabled,
  onDone,
  onError,
}: {
  propertyId: string;
  sites: string[];
  disabled: boolean;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [site, setSite] = useState(sites[0] ?? "");
  const [pending, start] = useTransition();

  return (
    <div className="flex max-w-[180px] flex-col gap-1">
      <select
        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        value={site}
        disabled={disabled || pending}
        onChange={(e) => setSite(e.target.value)}
      >
        {sites.map((s) => (
          <option key={s} value={s}>
            {s.length > 28 ? `${s.slice(0, 26)}…` : s}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={disabled || pending || !site}
        onClick={() =>
          start(async () => {
            const res = await linkSeoPropertyToGsc({ propertyId, gscSiteUrl: site });
            if (!res.ok) {
              onError(res.error);
              return;
            }
            onDone();
          })
        }
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : "Link"}
      </Button>
    </div>
  );
}

export function SeoAutopilotSitesPanel() {
  const { admin, ga4Analytics, siteTraffic, website } = useSeoAutopilot();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [externalDomain, setExternalDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState(admin.customDomain ?? "");
  const [cnameCopied, setCnameCopied] = useState(false);
  const [contentEnabled, setContentEnabled] = useState(admin.settings.contentAutopilotEnabled);
  const [useAiContent, setUseAiContent] = useState(admin.settings.useAiContent);
  const [reportEnabled, setReportEnabled] = useState(admin.settings.monthlyReportEnabled);
  const [reportEmail, setReportEmail] = useState(admin.settings.reportEmail ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!admin.hasFeature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sites &amp; settings</CardTitle>
          <CardDescription>Upgrade to manage websites under SEO Autopilot.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function runAction(
    fn: () => Promise<{ ok: boolean; error?: string; summary?: string }>,
    id?: string,
  ) {
    setError(null);
    setMessage(null);
    if (id) setBusyId(id);
    startTransition(async () => {
      const result = await fn();
      if (id) setBusyId(null);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setMessage(result.summary ?? "Saved.");
      router.refresh();
    });
  }

  function saveSettings() {
    runAction(() =>
      updateSeoAutopilotSettings({
        contentAutopilotEnabled: contentEnabled,
        useAiContent,
        monthlyReportEnabled: reportEnabled,
        reportEmail: reportEmail.trim() || null,
      }),
    );
  }

  const showGa4Reconnect = needsGa4GoogleReconnect({
    gscConnected: admin.gsc.connected,
    ga4Configured: siteTraffic.ga4Configured,
    ga4Available: ga4Analytics.available,
  });

  const customDomainProperty = admin.properties.find((p) => p.source === "CUSTOM_DOMAIN");

  async function copyCname() {
    if (!admin.cnameTarget) return;
    try {
      await navigator.clipboard.writeText(admin.cnameTarget);
      setCnameCopied(true);
      window.setTimeout(() => setCnameCopied(false), 2000);
    } catch {
      setError("Could not copy — select and copy the CNAME target manually.");
    }
  }

  return (
    <div className="space-y-6">
      {showGa4Reconnect ? <SeoGoogleReconnectBanner onError={(msg) => setError(msg)} /> : null}
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-brand-light/40 bg-brand-light/10 px-4 py-3 text-sm text-brand-navy">
          {message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Google Search Console</CardTitle>
          <CardDescription>
            Connect to pull clicks, impressions, auto-submit your sitemap when you publish, and read
            GA4 sessions when a measurement ID is set.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {admin.gsc.connected ? (
            <>
              <Badge className="bg-green-700 text-white hover:bg-green-700/90">Connected</Badge>
              <span className="text-sm text-muted-foreground">
                {admin.gsc.sites.length} propert{admin.gsc.sites.length === 1 ? "y" : "ies"} available
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  runAction(async () => {
                    const res = await disconnectGoogleSearchConsole();
                    return res;
                  })
                }
              >
                Disconnect
              </Button>
            </>
          ) : admin.gsc.configured ? (
            <GoogleSearchConsoleConnectButton onError={(msg) => setError(msg)} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Platform admin must set <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>{" "}
              and <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autopilot settings</CardTitle>
          <CardDescription>
            Content generation enriches your microsite from canned jobs. {PLANS.ENTERPRISE.name} shops can
            use AI to refine meta tags, services, and keywords.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Content mode:{" "}
            {admin.aiSeoContent && admin.settings.useAiContent && admin.aiConfigured ? (
              <span className="font-medium text-brand-navy">AI-enhanced ({PLANS.ENTERPRISE.name})</span>
            ) : admin.aiSeoContent && admin.settings.useAiContent && !admin.aiConfigured ? (
              <span className="font-medium text-amber-800">Template only — AI not configured</span>
            ) : admin.aiSeoContent && !admin.settings.useAiContent ? (
              <span className="font-medium text-brand-navy">Template only (AI disabled)</span>
            ) : (
              <span className="font-medium text-brand-navy">
                Template only — upgrade to {PLANS.ENTERPRISE.name} for AI content
              </span>
            )}
          </div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={contentEnabled}
              disabled={pending}
              onCheckedChange={(v) => setContentEnabled(v === true)}
            />
            <span>
              <span className="font-medium">Content autopilot</span>
              <span className="mt-0.5 block text-muted-foreground">
                Bi-weekly: add service pages and local keywords from your canned jobs.
                {admin.settings.lastContentRunAt ? (
                  <> Last run {formatWhen(admin.settings.lastContentRunAt)}.</>
                ) : null}
              </span>
            </span>
          </label>
          {admin.aiSeoContent ? (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={useAiContent}
                disabled={pending || !contentEnabled}
                onCheckedChange={(v) => setUseAiContent(v === true)}
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="size-3.5 text-brand-navy" />
                  AI content refinement
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  Use {PLANS.ENTERPRISE.name} AI to improve meta tags, service blurbs, and keywords.
                </span>
              </span>
            </label>
          ) : null}
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={reportEnabled}
              disabled={pending}
              onCheckedChange={(v) => setReportEnabled(v === true)}
            />
            <span>
              <span className="font-medium">Monthly email report</span>
              <span className="mt-0.5 block text-muted-foreground">Sent on the 1st of each month.</span>
            </span>
          </label>
          <div className="max-w-md space-y-2">
            <Label htmlFor="report-email" className="flex items-center gap-1.5 text-sm">
              <Mail className="size-3.5" />
              Report email
            </Label>
            <Input
              id="report-email"
              type="email"
              placeholder="owner@yourshop.com"
              value={reportEmail}
              disabled={pending}
              onChange={(e) => setReportEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={saveSettings}>
              Save settings
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runAction(() => runSeoContentNow())}
            >
              Run content now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom domain</CardTitle>
          <CardDescription>
            Point your domain at ShopRally with a CNAME record, then verify DNS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <Label htmlFor="custom-domain">Domain</Label>
              <Input
                id="custom-domain"
                placeholder="www.yourshop.com"
                value={customDomainInput}
                disabled={pending}
                onChange={(e) => setCustomDomainInput(e.target.value)}
              />
            </div>
            <Button
              disabled={pending}
              onClick={() =>
                runAction(async () => {
                  const result = await saveShopCustomDomain(customDomainInput);
                  return result;
                })
              }
            >
              Save domain
            </Button>
          </div>

          {admin.customDomain ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={website.customDomainVerified ? "default" : "secondary"}>
                  {website.customDomainVerified ? "DNS verified" : "Pending verification"}
                </Badge>
                <span className="text-sm text-muted-foreground">{admin.customDomain}</span>
              </div>

              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Open your domain registrar or DNS host.</li>
                <li>
                  Add a <strong className="text-foreground">CNAME</strong> record for{" "}
                  <code className="rounded bg-muted px-1">{admin.customDomain}</code>
                </li>
                <li>
                  Point it to the target below (copy exactly — no https://).
                </li>
                <li>
                  Wait for DNS to propagate (often 15–60 minutes), then click Verify DNS.
                </li>
              </ol>

              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">CNAME target</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="break-all font-mono text-xs">{admin.cnameTarget}</code>
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={copyCname}>
                    {cnameCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {cnameCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {customDomainProperty && !website.customDomainVerified ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    runAction(async () => {
                      const result = await verifySeoProperty(customDomainProperty.id);
                      return result;
                    })
                  }
                >
                  Verify DNS
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Save a domain above to see DNS instructions and verification.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-brand-navy" />
            Websites under management
          </CardTitle>
          <CardDescription>Pause autopilot per site anytime.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>GSC</TableHead>
                <TableHead>Last audit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admin.properties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No sites yet — publish your microsite under ShopSite to get started.
                  </TableCell>
                </TableRow>
              ) : (
                admin.properties.map((property) => {
                  const isBusy = busyId === property.id && pending;
                  const autopilotOn =
                    property.automationEnabled && property.status === "ACTIVE";
                  return (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div className="font-medium">{property.domain}</div>
                        {property.siteUrl ? (
                          <a
                            href={property.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-navy hover:underline"
                          >
                            View
                            <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {SOURCE_LABEL[property.source] ?? property.source}
                      </TableCell>
                      <TableCell>
                        {property.latestScore != null ? (
                          <span className={scoreClass(property.latestScore)}>
                            {property.latestScore}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {property.gscPropertyUrl ? (
                          <span className="text-muted-foreground">Linked</span>
                        ) : admin.gsc.connected && admin.gsc.sites.length > 0 ? (
                          <GscPropertyLinker
                            propertyId={property.id}
                            sites={admin.gsc.sites}
                            disabled={pending}
                            onDone={() => router.refresh()}
                            onError={setError}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatWhen(property.lastAuditAt)}
                      </TableCell>
                      <TableCell>{statusBadge(property)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={isBusy}
                            onClick={() =>
                              runAction(() => runSeoAuditNow(property.id), property.id)
                            }
                          >
                            {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : "Run audit"}
                          </Button>
                          {autopilotOn ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 text-muted-foreground"
                              disabled={isBusy}
                              onClick={() =>
                                runAction(() => pauseSeoProperty(property.id), property.id)
                              }
                            >
                              <Pause className="size-3.5" />
                              Pause
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 text-brand-navy"
                              disabled={isBusy || property.status === "PENDING_VERIFICATION"}
                              onClick={() =>
                                runAction(() => resumeSeoProperty(property.id), property.id)
                              }
                            >
                              <Play className="size-3.5" />
                              Enable
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-brand-navy" />
              Add external website
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <Input
                  placeholder="www.yourshop.com"
                  value={externalDomain}
                  onChange={(e) => setExternalDomain(e.target.value)}
                />
              </div>
              <Button
                disabled={pending || !externalDomain.trim()}
                onClick={() =>
                  runAction(async () => {
                    const result = await addExternalSeoSite({ domain: externalDomain });
                    if (result.ok) setExternalDomain("");
                    return result;
                  })
                }
              >
                Add site
              </Button>
            </div>
          </div>

          {admin.properties.some((p) => p.verification) ? (
            <div className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-4">
              <p className="text-sm font-medium text-amber-950">Domain verification</p>
              {admin.properties
                .filter((p) => p.verification)
                .map((property) => (
                  <div key={property.id} className="rounded-md border bg-background p-3 text-sm">
                    <p className="font-medium">{property.domain}</p>
                    {property.source === "CUSTOM_DOMAIN" && property.cnameTarget ? (
                      <p className="mt-2 font-mono text-[11px]">{property.cnameTarget}</p>
                    ) : property.verification ? (
                      <dl className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                        <div>
                          <dt className="inline font-semibold text-foreground">TXT: </dt>
                          <dd className="inline break-all">{property.verification.txtValue}</dd>
                        </div>
                      </dl>
                    ) : null}
                    <Button
                      size="sm"
                      className="mt-3 h-8 bg-brand-navy hover:bg-brand-navy/90"
                      disabled={pending}
                      onClick={() => runAction(() => verifySeoProperty(property.id), property.id)}
                    >
                      Verify domain
                    </Button>
                  </div>
                ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Button asChild variant="outline" size="sm">
        <Link href="/marketing/website">{GROWTH_PRODUCTS.shopSite.label} editor</Link>
      </Button>
    </div>
  );
}
