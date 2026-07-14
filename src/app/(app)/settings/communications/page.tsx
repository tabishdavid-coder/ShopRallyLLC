import { redirect } from "next/navigation";

/** Default Communications — Email (Core-safe); Phone & SMS is Pro+ with a locked wall. */
export default function CommunicationsSettingsPage() {
  redirect("/settings/communications/email");
}
