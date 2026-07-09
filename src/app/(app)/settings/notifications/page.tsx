import { redirect } from "next/navigation";

/** Legacy URL — Notifications lives under Communications. */
export default function NotificationsSettingsRedirectPage() {
  redirect("/settings/communications/notifications");
}
