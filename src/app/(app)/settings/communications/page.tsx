import { redirect } from "next/navigation";

/** Default Communications section — Phone & SMS first (Tekmetric-style). */
export default function CommunicationsSettingsPage() {
  redirect("/settings/communications/phone-sms");
}
