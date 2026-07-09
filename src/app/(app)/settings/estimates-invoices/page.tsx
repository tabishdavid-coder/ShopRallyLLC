import { redirect } from "next/navigation";

/** Legacy route — Quote & Invoice Display lives under RO Settings. */
export default function EstimatesInvoicesSettingsPage() {
  redirect("/settings/ro-settings?section=quote-invoice-display");
}
