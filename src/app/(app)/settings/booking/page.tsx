import { redirect } from "next/navigation";

/** Legacy settings URL — Online Booking lives under Shop Growth. */
export default function BookingSettingsRedirectPage() {
  redirect("/marketing/online-booking");
}
