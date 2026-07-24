"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Play,
  RefreshCw,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime } from "@/lib/datetime";
import {
  OEM_AUTOMATION_JOBS,
  type OemAutomationJobName,
} from "@/lib/oem-automation-sources";
import type {
  AutomationJobRunRow,
  FallbackEventRow,
  HealthAlertRow,
  ScraperSourceRow,
  SourceHealthLogRow,
} from "@/lib/oem-automation-types";
import {
  initOemScraperSources,
  requestOemRepairPrompt,
  triggerOemHealthCheck,
} from "@/server/actions/platform-oem-automation";

const JOB_LABELS: Record<OemAutomationJobName, string> = {
  quarterly_scrape: "Quarterly OEM scrape",
  daily_telemetry_update: "Daily telemetry (2 AM)",
  daily_health_check: "Daily health check (3 AM)",
};

function statusTone(status: string): string {
  if (status === "active" || status === "success") return "text-emerald-700";
  if (status === "degraded" || status === "warning" || status === "running") {
    return "text-amber-700";
  }
  if (status === "disabled" || status === "failed" || status === "critical") {
    return "text-brand-red";
  }
  return "text-muted-foreground";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${statusTone(value)}`}>
      {value}
    </span>
  );
}

type Props = {
  sources: ScraperSourceRow[];
  alerts: HealthAlertRow[];
  jobRuns: AutomationJobRunRow[];
  latestByJob: Partial<Record<OemAutomationJobName, AutomationJobRunRow>>;
  fallbackEvents: FallbackEventRow[];
  healthLogs: SourceHealthLogRow[];
};

export function PlatformOemAutomation({
  sources,
  alerts,
  jobRuns,
  latestByJob,
  fallbackEvents,
  healthLogs,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [repairSource, setRepairSource] = useState("");
  const [repairSample, setRepairSample] = useState("");
  const [repairPrompt, setRepairPrompt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(fn: () => Promise<{ ok: boolean; error?: string; message?: string; prompt?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setMessage(result.message ?? "Done.");
        if (result.prompt) setRepairPrompt(result.prompt);
      } else {
        setMessage(result.error ?? "Action failed.");
      }
    });
  }

  return (
    <section className="space-y-6 rounded-xl border border-brand-navy/15 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="size-4 text-brand-navy" />
            <h3 className="font-semibold text-brand-navy">OEM data health & automation</h3>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Platform-level scraper sources, redundancy fallback audit, health probes, and scheduled
            job history. Shop CRM data stays tenant-scoped — this panel monitors shared OEM harvest
            infrastructure only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-brand-navy hover:bg-brand-navy/90"
            disabled={pending}
            onClick={() => runAction(triggerOemHealthCheck)}
          >
            {pending ? (
              <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 size-3.5" />
            )}
            Run health check now
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runAction(initOemScraperSources)}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Init sources
          </Button>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-brand-light/40 bg-brand-light/10 px-3 py-2 text-sm text-brand-navy">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-brand-navy" />
            <h4 className="text-sm font-semibold text-brand-navy">Scraper sources</h4>
          </div>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sources configured. Click <strong>Init sources</strong> to seed defaults.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Health</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Success / Fail</th>
                    <th className="px-3 py-2">Last attempted</th>
                    <th className="px-3 py-2">Last healthy</th>
                    <th className="px-3 py-2">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <p className="font-medium text-brand-navy">{row.sourceName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {row.baseUrl}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge value={row.status} />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge value={row.healthStatus} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.priority}
                        {row.originalPriority != null ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (was {row.originalPriority})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        <span className="text-emerald-700">{row.successCount}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-brand-red">{row.failureCount}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {row.lastAttempted ? fmtDateTime(row.lastAttempted) : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {row.lastHealthyCheck ? fmtDateTime(row.lastHealthyCheck) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-brand-red max-w-[200px] truncate">
                        {row.lastError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-brand-red" />
            <h4 className="text-sm font-semibold text-brand-navy">Health alerts</h4>
          </div>
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" />
              No open alerts.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-md border border-brand-red/20 bg-brand-red/5 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-brand-navy">{alert.sourceName}</span>
                    <StatusBadge value={alert.severity} />
                  </div>
                  <p className="mt-1 text-muted-foreground">{alert.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(alert.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-brand-navy" />
            <h4 className="text-sm font-semibold text-brand-navy">Recent fallback events</h4>
          </div>
          {fallbackEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fallback events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Primary → Fallback</th>
                    <th className="px-3 py-2">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {fallbackEvents.map((evt) => (
                    <tr key={evt.id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {fmtDateTime(evt.timestamp)}
                      </td>
                      <td className="px-3 py-2 font-medium">{evt.dataType}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {evt.primarySource ?? "—"} → {evt.fallbackSource ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge value={evt.success ? "success" : "failed"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-brand-light" />
            <h4 className="text-sm font-semibold text-brand-navy">Source health log</h4>
          </div>
          {healthLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No probe attempts logged yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90">
                  <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Ms</th>
                  </tr>
                </thead>
                <tbody>
                  {healthLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {fmtDateTime(log.timestamp)}
                      </td>
                      <td className="px-3 py-2">{log.sourceName}</td>
                      <td className="px-3 py-2">
                        <StatusBadge value={log.status} />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {log.responseTimeMs ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-brand-navy" />
          <h4 className="text-sm font-semibold text-brand-navy">Automation audit</h4>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {OEM_AUTOMATION_JOBS.map((jobName) => {
            const latest = latestByJob[jobName];
            return (
              <div
                key={jobName}
                className="rounded-lg border bg-muted/20 p-3 text-sm"
              >
                <p className="font-medium text-brand-navy">{JOB_LABELS[jobName]}</p>
                {latest ? (
                  <>
                    <p className="mt-1 text-muted-foreground">
                      Last run: {fmtDateTime(latest.startedAt)}
                    </p>
                    <p className="mt-0.5">
                      Status: <StatusBadge value={latest.status} />
                    </p>
                    {latest.nextScheduledAt ? (
                      <p className="mt-0.5 text-muted-foreground">
                        Next: {fmtDateTime(latest.nextScheduledAt)}
                      </p>
                    ) : null}
                    {latest.errorMessage ? (
                      <p className="mt-1 text-xs text-brand-red">{latest.errorMessage}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-muted-foreground">No runs recorded yet.</p>
                )}
              </div>
            );
          })}
        </div>

        {jobRuns.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Finished</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Next scheduled</th>
                </tr>
              </thead>
              <tbody>
                {jobRuns.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{row.jobName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {fmtDateTime(row.startedAt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {row.finishedAt ? fmtDateTime(row.finishedAt) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {row.nextScheduledAt ? fmtDateTime(row.nextScheduledAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-brand-navy" />
          <h4 className="text-sm font-semibold text-brand-navy">Cursor-assisted repair</h4>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a paste-ready Cursor prompt with broken config, error, and SQL UPDATE template.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Source name (e.g. partsouq)"
            value={repairSource}
            onChange={(e) => setRepairSource(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !repairSource.trim()}
            onClick={() =>
              runAction(() =>
                requestOemRepairPrompt({
                  sourceName: repairSource.trim(),
                  sampleResponse: repairSample.trim() || undefined,
                }),
              )
            }
          >
            Generate repair prompt
          </Button>
        </div>
        <Textarea
          className="mt-3 min-h-[80px]"
          placeholder="Optional HTML/JSON snippet from failed response"
          value={repairSample}
          onChange={(e) => setRepairSample(e.target.value)}
        />
        {repairPrompt ? (
          <div className="mt-3 space-y-2">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void navigator.clipboard.writeText(repairPrompt)}
              >
                <Copy className="mr-1.5 size-3.5" />
                Copy prompt
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {repairPrompt}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}
