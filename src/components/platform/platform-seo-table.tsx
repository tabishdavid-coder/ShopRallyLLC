"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pause, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlatformSeoAdmin } from "@/lib/seo-automation";
import {
  platformPauseSeoProperty,
  platformResumeSeoProperty,
} from "@/server/actions/platform-seo";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PlatformSeoTable({ admin }: { admin: PlatformSeoAdmin }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(propertyId: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setBusyId(propertyId);
    start(async () => {
      const result = await fn();
      setBusyId(null);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total sites</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{admin.stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Autopilot on</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{admin.stats.autopilotOn}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending verification</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{admin.stats.pendingVerification}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All tenant SEO properties</CardTitle>
          <CardDescription>
            Pause or enable autopilot for any shop website from the platform console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admin.properties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No SEO properties registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                admin.properties.map((row) => {
                  const busy = busyId === row.id && pending;
                  const autopilotOn = row.automationEnabled && row.status === "ACTIVE";
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.shopName}</div>
                        <div className="text-xs text-muted-foreground">{row.shopCode}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.domain}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.source}</TableCell>
                      <TableCell>
                        {row.latestScore != null ? `${row.latestScore}%` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {autopilotOn ? (
                            <Badge className="bg-brand-navy text-white hover:bg-brand-navy/90">
                              Autopilot
                            </Badge>
                          ) : (
                            <Badge variant="outline">Paused</Badge>
                          )}
                          {!row.verified ? (
                            <Badge variant="secondary">Unverified</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last audit {formatWhen(row.lastAuditAt)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {autopilotOn ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1"
                            disabled={busy}
                            onClick={() =>
                              run(row.id, () => platformPauseSeoProperty(row.id))
                            }
                          >
                            {busy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Pause className="size-3.5" />
                            )}
                            Pause
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-brand-navy"
                            disabled={busy || !row.verified}
                            onClick={() =>
                              run(row.id, () => platformResumeSeoProperty(row.id))
                            }
                          >
                            {busy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Play className="size-3.5" />
                            )}
                            Enable
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
