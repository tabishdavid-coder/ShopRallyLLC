import { redirect } from "next/navigation";

export default function EstimateTermsSettingsPage() {
  redirect("/settings/ro-settings?section=estimate-terms");
}
