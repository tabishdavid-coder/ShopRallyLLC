"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import type { NotificationTypeKey } from "@/lib/notification-types";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";
import type { AppNotification } from "@/server/notifications";
import { NotificationSettingsDialog } from "./notification-settings-dialog";

function formatGroupHeader(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatItemTime(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function iconForType(type: NotificationTypeKey) {
  switch (type) {
    case "CUSTOMER_VIEWED_ESTIMATE":
    case "CUSTOMER_VIEWED_INSPECTION":
      return Eye;
    case "RO_AUTHORIZED":
    case "RO_CREATED":
    case "RO_COMPLETED":
    case "RO_STATUS_CHANGED":
      return FileText;
    case "SMS_RECEIVED":
      return MessageSquare;
    case "TIRE_APPROVAL_PENDING":
      return Wrench;
    case "PAYMENT_RECEIVED":
      return CreditCard;
    default:
      return CheckCircle2;
  }
}

function groupNotifications(items: AppNotification[]) {
  const groups: { header: string; items: AppNotification[] }[] = [];
  let currentHeader = "";
  for (const item of items) {
    const header = formatGroupHeader(item.timestamp);
    if (header !== currentHeader) {
      groups.push({ header, items: [item] });
      currentHeader = header;
    } else {
      groups[groups.length - 1]!.items.push(item);
    }
  }
  return groups;
}

export function NotificationPanel({
  open,
  onOpenChange,
  notifications,
  unreadCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, start] = useTransition();

  const visible = useMemo(
    () => (tab === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [notifications, tab],
  );
  const groups = useMemo(() => groupNotifications(visible), [visible]);

  function markAllRead() {
    start(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  function openNotification(n: AppNotification) {
    start(async () => {
      if (!n.read) await markNotificationReadAction(n.id);
      onOpenChange(false);
      router.push(n.href);
      router.refresh();
    });
  }

  function markOneRead(e: React.MouseEvent, key: string) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      await markNotificationReadAction(key);
      router.refresh();
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[400px]"
        >
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3 pr-12">
            <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-brand-navy"
                  disabled={pending}
                  onClick={markAllRead}
                >
                  Mark all read
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Notification settings"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className={subnavBarClass("border-b-0")}>
            <button
              type="button"
              className={subnavTabClass(tab === "all", "flex-1")}
              aria-current={tab === "all" ? "page" : undefined}
              onClick={() => setTab("all")}
            >
              All
            </button>
            <button
              type="button"
              className={subnavTabClass(tab === "unread", "flex-1")}
              aria-current={tab === "unread" ? "page" : undefined}
              onClick={() => setTab("unread")}
            >
              Unread
              {unreadCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-brand-red/10 px-1.5 text-xs text-brand-red">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Bell className="mb-3 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {tab === "unread"
                    ? "You have no unread notifications."
                    : "No notifications yet."}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.header}>
                  <div className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                    {group.header}
                  </div>
                  <ul>
                    {group.items.map((n) => {
                      const Icon = iconForType(n.type);
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={cn(
                              "group flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/40",
                              !n.read && "bg-brand-navy/[0.03]",
                            )}
                            onClick={() => openNotification(n)}
                          >
                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/10">
                              <Icon className="size-4 text-brand-navy" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-sm leading-snug",
                                  !n.read && "font-medium",
                                )}
                              >
                                {n.title}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatItemTime(n.timestamp)}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="invisible shrink-0 rounded p-1 text-muted-foreground hover:bg-muted group-hover:visible"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="size-4" />
                                </span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!n.read ? (
                                  <DropdownMenuItem onClick={(e) => markOneRead(e, n.id)}>
                                    Mark as read
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem asChild>
                                  <Link href={n.href}>View</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="border-t px-4 py-3">
            <Link
              href="/settings/communications/notifications"
              className="text-sm font-medium text-brand-navy hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Notification settings
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
