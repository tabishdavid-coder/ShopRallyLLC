import { BRAND } from "@/lib/brand";

/** Canonical ShopRally platform contact (marketing, CRM support, billing). */
export const PLATFORM_CONTACT_EMAIL = BRAND.supportEmail;

/** @deprecated Prefer PLATFORM_CONTACT_EMAIL — kept for existing imports */
export const SUPPORT_EMAIL = PLATFORM_CONTACT_EMAIL;
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "(877) 746-4364";
export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE.replace(/\D/g, "")}`;
