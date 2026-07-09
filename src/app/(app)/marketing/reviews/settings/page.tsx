import { redirect } from "next/navigation";

/** Alias — settings live on the vendor integrations page. */
export default function GoogleReviewsSettingsPage() {
  redirect("/vendors/integrations/google-reviews");
}
