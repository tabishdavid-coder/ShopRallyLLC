import { EmailSettingsPanel } from "@/components/settings/email-settings";
import { getEmailSettings } from "@/server/actions/email-settings";

export const metadata = { title: "Email — Communications — Shop Settings" };
export const dynamic = "force-dynamic";

export default async function CommunicationsEmailPage() {
  const settings = await getEmailSettings();
  return <EmailSettingsPanel initial={settings} />;
}
