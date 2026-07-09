"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  Clock,
  Heart,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROWTH_ENGINE } from "@/lib/growth-engine-brand";
import { cn } from "@/lib/utils";
import type { AutomationListItem, AutomationSendHistoryRow, ScheduledMessageRow } from "@/server/automations";
import {
  deleteAutomation,
  toggleAutomationChannel,
} from "@/server/actions/automations";
import { AutomationEditDialog } from "@/components/marketing/automations/automation-edit-dialog";
import { ScheduledMessagesTable } from "@/components/marketing/automations/scheduled-messages-table";
import { AutomationSendHistoryTable } from "@/components/marketing/automations/automation-send-history-table";

const ICONS = {
  "calendar-check": CalendarCheck,
  calendar: Calendar,
  star: Star,
  alert: AlertTriangle,
  users: Users,
  clock: Clock,
  heart: Heart,
} as const;

type SubTab = "automations" | "scheduled" | "history";

export function AutomationsPageClient({
  automations,
  scheduledMessages,
  sendHistory,
  canManage,
}: {
  automations: AutomationListItem[];
  scheduledMessages: ScheduledMessageRow[];
  sendHistory: AutomationSendHistoryRow[];
  canManage: boolean;
}) {
  const [subTab, setSubTab] = useState<SubTab>("automations");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return automations;
    return automations.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    );
  }, [automations, search]);

  const editing = editId ? automations.find((a) => a.id === editId) : null;

  function toggleChannel(id: string, channel: "email" | "sms", enabled: boolean) {
    startTransition(async () => {
      await toggleAutomationChannel(id, channel, enabled);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete automation "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteAutomation(id);
    });
  }

  return (
    <div className="space-y-5 workspace-surface">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Automated customer messages triggered by appointments, completed ROs, and more.
        </p>
        {canManage ? (
          <Button
            className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
            disabled={pending}
            onClick={() => {
              const first = automations.find((a) => !a.configured);
              setEditId(first?.id ?? automations[0]?.id ?? null);
            }}
          >
            <Plus className="size-4" />
            New Automation
          </Button>
        ) : null}
      </div>

      {!canManage ? (
        <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-4 text-sm">
          {GROWTH_ENGINE.upgradeHint}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-b pb-3">
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setSubTab("automations")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              subTab === "automations"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Automations
          </button>
          <button
            type="button"
            onClick={() => setSubTab("scheduled")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              subTab === "scheduled"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Scheduled Messages
          </button>
          <button
            type="button"
            onClick={() => setSubTab("history")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              subTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Send history
          </button>
        </div>

        {subTab === "automations" ? (
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by automation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        ) : null}
      </div>

      {subTab === "scheduled" ? (
        <ScheduledMessagesTable rows={scheduledMessages} />
      ) : subTab === "history" ? (
        <AutomationSendHistoryTable rows={sendHistory} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Automation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"># Sent in the last 30 days</th>
                <th className="px-4 py-3"># Scheduled in the next 30 days</th>
                <th className="px-4 py-3">Performance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const Icon = ICONS[a.icon as keyof typeof ICONS] ?? Calendar;
                const active = a.emailEnabled || a.smsEnabled;
                return (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md bg-brand-light/25 p-2">
                          <Icon className="size-4 text-brand-navy" />
                        </div>
                        <div>
                          <p className="font-medium">{a.name}</p>
                          <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
                            {a.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {active ? "Active" : "Paused"}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                        <ChannelToggle
                          label="Email"
                          icon={Mail}
                          enabled={a.emailEnabled}
                          disabled={!canManage || pending}
                          onToggle={(v) => toggleChannel(a.id, "email", v)}
                        />
                        <ChannelToggle
                          label="Text"
                          icon={MessageSquare}
                          enabled={a.smsEnabled}
                          disabled={!canManage || pending}
                          onToggle={(v) => toggleChannel(a.id, "sms", v)}
                        />
                      </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <Mail className="size-3.5 text-muted-foreground" />
                          {a.sentCount30d} sent
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {active && a.scheduledCount30d > 0 ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 tabular-nums text-brand-navy hover:underline"
                          onClick={() => setSubTab("scheduled")}
                        >
                          <Clock className="size-3.5" />
                          {a.scheduledCount30d} scheduled
                        </button>
                      ) : active ? (
                        <span className="text-muted-foreground">0 scheduled</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.configured && active ? (
                        <button
                          type="button"
                          className="text-brand-navy hover:underline"
                          onClick={() => setEditId(a.id)}
                        >
                          View report
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={!canManage}
                          onClick={() => setEditId(a.id)}
                        >
                          Set Up
                        </Button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={!canManage}
                          onClick={() => setEditId(a.id)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          disabled={!canManage || pending}
                          onClick={() => handleDelete(a.id, a.name)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-end gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
            <span>Rows per page: 25</span>
            <span>
              1–{filtered.length} of {filtered.length}
            </span>
          </div>
        </div>
      )}

      {editing ? (
        <AutomationEditDialog
          automationId={editing.id}
          open={!!editId}
          onOpenChange={(open) => !open && setEditId(null)}
          canManage={canManage}
        />
      ) : null}
    </div>
  );
}

function ChannelToggle({
  label,
  icon: Icon,
  enabled,
  disabled,
  onToggle,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!enabled)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase transition-colors",
        enabled
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-emerald-600/40 bg-background text-emerald-700 hover:bg-emerald-50",
        disabled && "opacity-50",
      )}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}
