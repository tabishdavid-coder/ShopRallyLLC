import { MessagingSettingsPanel } from "@/components/settings/messaging-settings";
import { getMessagingSettings } from "@/server/actions/messaging-settings";

export const metadata = { title: "Phone & SMS — Communications — Shop Settings" };
export const dynamic = "force-dynamic";

export default async function CommunicationsPhoneSmsPage() {
  const settings = await getMessagingSettings();
  return <MessagingSettingsPanel initial={settings} />;
}
