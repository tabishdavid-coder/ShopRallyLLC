"use client";

import { useState, useTransition } from "react";
import { Bell, Check, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationPreferencesTable } from "@/components/notifications/notification-settings-dialog";
import {
  updateNotificationSettings,
  type NotificationSettings,
} from "@/server/actions/notification-settings";
import type { NotificationPreferences } from "@/lib/notification-types";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function NotificationSettingsPanel({ initial }: { initial: NotificationSettings }) {
  const [email, setEmail] = useState(initial.authorizationNotifyEmail ?? "");
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial.preferences);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateNotificationSettings({
        authorizationNotifyEmail: email,
        preferences: prefs,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control in-app alerts and where ShopRally sends shop emails when customers take action.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="size-4 text-brand-navy" />
          <h3 className="font-medium">In-app notifications</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose which events appear in your notification bell. Changes here only affect your account.
        </p>
        <NotificationPreferencesTable initial={initial.preferences} onChange={setPrefs} />
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-4 text-brand-navy" />
          <h3 className="font-medium">RO authorization email</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          When a customer approves an estimate via the public link, ShopRally sends an authorization
          summary to this address — approved and declined jobs with timestamps.
        </p>

        <label className="mb-1 block text-sm font-medium" htmlFor="auth-notify-email">
          Send RO authorization email to
        </label>
        <input
          id="auth-notify-email"
          type="email"
          className={inputCls}
          placeholder={initial.shopEmail ?? "service@yourshop.com"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Leave blank to use your shop email
          {initial.shopEmail ? ` (${initial.shopEmail})` : ""}, then the service writer, then the shop
          owner.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={pending} className="gap-2 bg-brand-navy">
          {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          Save notifications
        </Button>
        {saved ? <span className="text-sm text-emerald-600">Saved</span> : null}
      </div>
    </div>
  );
}
