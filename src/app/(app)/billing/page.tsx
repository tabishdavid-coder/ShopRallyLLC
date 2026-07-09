import { redirect } from "next/navigation";

/** Legacy alias — subscription lives in the settings shell. */
export default function BillingPage() {
  redirect("/settings/subscription");
}
