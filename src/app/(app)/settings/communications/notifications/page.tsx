import { NotificationSettingsPanel } from "@/components/settings/notification-settings";
import { getNotificationSettings } from "@/server/actions/notification-settings";

export const metadata = { title: "Notifications — Communications — Shop Settings" };
export const dynamic = "force-dynamic";

export default async function CommunicationsNotificationsPage() {
  const settings = await getNotificationSettings();
  return <NotificationSettingsPanel initial={settings} />;
}
