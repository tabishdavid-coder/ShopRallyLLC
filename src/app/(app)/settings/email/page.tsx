import { redirect } from "next/navigation";

/** Legacy URL — Email lives under Communications. */
export default function EmailSettingsRedirectPage() {
  redirect("/settings/communications/email");
}
