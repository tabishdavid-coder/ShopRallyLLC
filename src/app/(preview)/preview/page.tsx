import { redirect } from "next/navigation";

/** Legacy preview URL → new CRM home. */
export default function PreviewRedirectPage() {
  redirect("/dashboard");
}
