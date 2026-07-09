/**
 * Shop-configurable option lists. For now these are constants; they map to the
 * Shop Settings → Marketing (Lead Sources) and Appointments screens and will
 * become per-shop records when Settings is built.
 */

// Shop Settings → Marketing → Lead Sources
export const LEAD_SOURCES = [
  "No Source",
  "Referral",
  "Friends / Family",
  "Returning Customer",
  "Walk-in",
  "Fleet",
  "Employee",
  "Email",
  "Coupon / Mailer",
  "Google",
  "Facebook",
  "Yelp",
  "Radio",
  "Magazine / Newspaper",
  "TV",
  "Online Booking",
] as const;

// Create-RO → Appointment option
export const APPOINTMENT_OPTIONS = [
  "Drop-off Vehicle",
  "Waiting",
  "Pick-up / Delivery",
  "After Hours Drop-off",
  "Tow-in",
] as const;
