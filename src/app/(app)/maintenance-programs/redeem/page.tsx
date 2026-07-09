import { redirect } from "next/navigation";

/** Legacy route — redirects to the full service visit flow. */
export default function ExpressRedeemRedirect() {
  redirect("/maintenance-programs/visit");
}
