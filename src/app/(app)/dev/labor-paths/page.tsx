import Link from "next/link";
import { FlaskConical, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { validateLaborBrowsePaths } from "@/server/labor-browse-path-validation";

export const metadata = { title: "Labor Browse Paths — Dev" };

export const dynamic = "force-dynamic";

const PATTERN_LABEL: Record<string, string> = {
  "axle-first": "Axle-first (position → operation)",
  "operation-first": "Operation-first (operation → position)",
  "assembly-qualifier": "Assembly + qualifier band",
};

export default async function DevLaborPathsPage() {
  const { results, sampleRo } = await validateLaborBrowsePaths();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
      <header className="space-y-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <FlaskConical className="size-5 text-brand-navy" />
          <h1 className="text-lg font-semibold tracking-tight">Labor Browse Paths</h1>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            Q1 Option A mock
          </Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Two end-to-end browse paths for Tekmetric-style trail + list + detail. Validates hierarchy
          gating and cache resolution for the sandbox 2010 Honda Civic (
          <code className="text-xs">19XFA1F51AE028415</code>).
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link
            href="/dev/labor-mockup"
            className="inline-flex items-center gap-1 font-medium text-brand-orange hover:underline"
          >
            Visual mockup (Mock v3) <ExternalLink className="size-3" />
          </Link>
          <Link href="/quick-labor" className="inline-flex items-center gap-1 text-brand-navy hover:underline">
            Quick Labor <ExternalLink className="size-3" />
          </Link>
          {sampleRo ? (
            <Link
              href={`/repair-orders/${sampleRo.id}/estimate`}
              className="inline-flex items-center gap-1 text-brand-navy hover:underline"
            >
              RO #{sampleRo.number} estimate (Smart Labor Book) <ExternalLink className="size-3" />
            </Link>
          ) : (
            <span className="text-muted-foreground">No Civic RO in DB — use Quick Labor + VIN decode</span>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {results.map(({ def, hierarchyOk, hierarchyErrors, cacheHitCount, sampleHits, vehicleRowCount }) => (
          <section
            key={def.id}
            className="rounded-lg border border-brand-navy/10 bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-brand-navy">{def.title}</h2>
                <p className="text-xs text-muted-foreground">{PATTERN_LABEL[def.pattern] ?? def.pattern}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hierarchyOk ? (
                  <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                    <CheckCircle2 className="size-3" /> Hierarchy OK
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" /> Hierarchy fail
                  </Badge>
                )}
                <Badge variant={cacheHitCount > 0 ? "secondary" : "outline"} className="gap-1">
                  Cache: {cacheHitCount} hit{cacheHitCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>

            {hierarchyErrors.length > 0 ? (
              <ul className="mb-3 list-inside list-disc text-xs text-destructive">
                {hierarchyErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}

            <dl className="mb-4 grid gap-1 text-xs">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">Vehicle</dt>
                <dd>{def.vehicle.label}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">Trail</dt>
                <dd className="font-medium">
                  {def.steps[def.steps.length - 2]?.trail.slice(1).join(" › ") ?? "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">Query</dt>
                <dd>
                  <code>{def.syntheticQuery}</code>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">Add target</dt>
                <dd>{def.addToJobTarget}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">YMM rows</dt>
                <dd>{vehicleRowCount} cached labor rows for vehicle</dd>
              </div>
            </dl>

            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-navy/70">
              Click sequence
            </h3>
            <ol className="mb-4 space-y-2">
              {def.steps.map((s) => (
                <li key={s.step} className="rounded border border-brand-navy/8 bg-brand-navy/[0.02] p-2 text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-brand-navy">
                      {s.step}. {s.click}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {s.millerColumn}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Trail:{" "}
                    <span className="text-foreground/85">{s.trail.slice(1).join(" › ") || "(root)"}</span>
                  </p>
                  <p className="text-muted-foreground">Middle: {s.middlePane}</p>
                </li>
              ))}
            </ol>

            {sampleHits.length > 0 ? (
              <>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-navy/70">
                  Sample cache hits
                </h3>
                <ul className="space-y-1 text-xs">
                  {sampleHits.map((h) => (
                    <li key={h.jobName} className="flex justify-between gap-2 border-b border-brand-navy/5 py-1">
                      <span>{h.jobName}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {h.totalHours != null ? `${h.totalHours}h` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-amber-700">
                No cache hits — run <code>npm run db:build-labor</code> or use Generate with AI in Smart
                Labor Book.
              </p>
            )}
          </section>
        ))}
      </div>

      <footer className="rounded-lg border border-dashed border-brand-navy/15 bg-brand-navy/[0.02] p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Manual Miller test:</strong> Open Smart Labor Book on an RO →
        follow click sequence above (5 columns today). Quick chips{" "}
        <code>Front brakes</code> and <code>Struts</code> pre-fill Path 1 and Path 2. Script:{" "}
        <code>npx tsx scripts/test-labor-paths.ts</code>
      </footer>
    </div>
  );
}
