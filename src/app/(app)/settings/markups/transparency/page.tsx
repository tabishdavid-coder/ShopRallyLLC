import { redirect } from "next/navigation";

/** Legacy route — transparency moved under RO Settings. */
export default function MarkupsTransparencyPage() {
  redirect("/settings/ro-settings?section=quote-invoice-display");
}
