import { redirect } from "next/navigation";

/** End-customer data lives in shop CRM — platform owner manages tenants only. */
export default function PlatformCustomersRedirect() {
  redirect("/platform/shops");
}
