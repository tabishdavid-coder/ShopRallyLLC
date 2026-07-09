import { createHmac, timingSafeEqual } from "node:crypto";

export function formToRecord(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}

export function twilioSignatureValid(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token) {
    return (
      process.env.NODE_ENV !== "production" && process.env.TWILIO_WEBHOOK_DEV_ALLOW === "1"
    );
  }
  if (!signature) return false;

  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", token).update(sorted).digest("base64");

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
