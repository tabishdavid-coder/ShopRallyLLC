import { BRAND } from "@/lib/brand";

export const SUPPORT_EMAIL = BRAND.supportEmail;
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "(877) 746-4364";
export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE.replace(/\D/g, "")}`;
