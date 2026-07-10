"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/server/notifications";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell({
  notifications,
  unreadCount,
  triggerClassName,
  iconOnly = false,
}: {
  notifications: AppNotification[];
  unreadCount: number;
  triggerClassName?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "relative gap-1.5 px-2",
          open && "bg-muted",
          iconOnly && "size-9 px-0",
          triggerClassName,
        )}
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell className="size-4" />
        {!iconOnly ? <span className="hidden sm:inline">Notifications</span> : null}
        {unreadCount > 0 ? (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-brand-red font-bold text-white",
              iconOnly
                ? "-right-0.5 -top-0.5 min-w-4 px-1 text-[9px] leading-4"
                : "-right-0.5 -top-0.5 size-4 text-[10px]",
            )}
          >
            {badge}
          </span>
        ) : null}
      </Button>

      <NotificationPanel
        open={open}
        onOpenChange={setOpen}
        notifications={notifications}
        unreadCount={unreadCount}
      />
    </>
  );
}
