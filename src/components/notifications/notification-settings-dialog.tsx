"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_TYPES,
  type NotificationPreferences,
  type NotificationScope,
} from "@/lib/notification-types";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/server/actions/notification-settings";

const SCOPES: { value: NotificationScope; label: string }[] = [
  { value: "ALL", label: "All work" },
  { value: "MY_WORK", label: "My work" },
  { value: "NONE", label: "None" },
];

export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({});
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotificationSettings()
      .then((s) => setPrefs(s.preferences))
      .finally(() => setLoading(false));
  }, [open]);

  function setScope(key: string, scope: NotificationScope) {
    setPrefs((p) => ({ ...p, [key]: scope }));
  }

  function save() {
    start(async () => {
      await updateNotificationSettings({ preferences: prefs });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Notification settings</DialogTitle>
          <DialogDescription>
            Changing notifications here only affects your account. Others will not be impacted.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Notification</th>
                  <th className="pb-2 px-2 text-center font-medium">All work</th>
                  <th className="pb-2 px-2 text-center font-medium">My work</th>
                  <th className="pb-2 pl-2 text-center font-medium">None</th>
                </tr>
              </thead>
              <tbody>
                {NOTIFICATION_TYPES.map(({ key, label }) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">{label}</td>
                    {SCOPES.map(({ value }) => (
                      <td key={value} className="px-2 py-2.5 text-center">
                        <label className="inline-flex cursor-pointer items-center justify-center">
                          <input
                            type="radio"
                            name={`pref-${key}`}
                            checked={(prefs[key] ?? "ALL") === value}
                            onChange={() => setScope(key, value)}
                            className="size-4 accent-brand-navy"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-brand-navy" disabled={pending || loading} onClick={save}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Save notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Inline preference table for /settings/notifications page. */
export function NotificationPreferencesTable({
  initial,
  onChange,
}: {
  initial: NotificationPreferences;
  onChange: (prefs: NotificationPreferences) => void;
}) {
  const [prefs, setPrefs] = useState(initial);

  function setScope(key: string, scope: NotificationScope) {
    const next = { ...prefs, [key]: scope };
    setPrefs(next);
    onChange(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Notification</th>
            {SCOPES.map((s) => (
              <th key={s.value} className="pb-2 px-2 text-center font-medium">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NOTIFICATION_TYPES.map(({ key, label }) => (
            <tr key={key} className="border-b last:border-0">
              <td className="py-2.5 pr-4">{label}</td>
              {SCOPES.map(({ value }) => (
                <td key={value} className="px-2 py-2.5 text-center">
                  <input
                    type="radio"
                    name={`settings-${key}`}
                    checked={(prefs[key] ?? "ALL") === value}
                    onChange={() => setScope(key, value)}
                    className={cn("size-4 accent-brand-navy")}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
