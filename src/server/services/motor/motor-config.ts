import "server-only";

/** MOTOR DaaS base URL (production). Override for sandbox if MOTOR provides one. */
export function motorApiBaseUrl(): string {
  return (process.env.MOTOR_API_BASE_URL?.trim() || "https://api.motor.com").replace(/\/$/, "");
}

export function motorPublicKey(): string | null {
  return process.env.MOTOR_PUBLIC_KEY?.trim() || null;
}

export function motorPrivateKey(): string | null {
  return (
    process.env.MOTOR_PRIVATE_KEY?.trim() ||
    process.env.MOTOR_API_KEY?.trim() ||
    null
  );
}

/**
 * Kill switch: set MOTOR_ENABLED=false to disable without removing code.
 * Requires both public + private keys (MOTOR Shared HMAC auth).
 */
export function isMotorLaborEnabled(): boolean {
  if (process.env.MOTOR_ENABLED === "false") return false;
  if (process.env.MOTOR_ENABLED === "true") {
    return Boolean(motorPublicKey() && motorPrivateKey());
  }
  return Boolean(motorPublicKey() && motorPrivateKey());
}
