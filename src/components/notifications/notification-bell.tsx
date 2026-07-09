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
}: {
  notifications: AppNotification[];
  unreadCount: number;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn("relative gap-1.5 px-2", open && "bg-white/10", triggerClassName)}
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell className="size-4" />
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
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
