import { redirect } from "next/navigation";

/** Legacy URL — Phone & SMS lives under Communications. */
export default function MessagingSettingsRedirectPage() {
  redirect("/settings/communications/phone-sms");
}
