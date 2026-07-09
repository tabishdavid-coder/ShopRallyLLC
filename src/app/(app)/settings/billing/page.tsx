import { redirect } from "next/navigation";

/** Legacy alias — subscription lives in the settings shell. */
export default function BillingSettingsPage() {
  redirect("/settings/subscription");
}
