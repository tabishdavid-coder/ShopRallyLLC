// Client-safe employee enums/labels (don't import the prisma enum values client-side).

export const EMPLOYEE_ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "SERVICE_WRITER", label: "Service Writer" },
  { value: "TECHNICIAN", label: "Technician" },
] as const;
export type EmployeeRoleValue = (typeof EMPLOYEE_ROLES)[number]["value"];
export const roleLabel = (r: string): string =>
  EMPLOYEE_ROLES.find((x) => x.value === r)?.label ?? r;

export const PAYROLL_TYPES = [
  { value: "SALARY", label: "Salary" },
  { value: "FLAT_RATE", label: "Flat Rate" },
  { value: "HOURLY", label: "Hourly Rate" },
] as const;
export type PayrollTypeValue = (typeof PAYROLL_TYPES)[number]["value"];
export const payrollLabel = (p: string | null): string =>
  p ? PAYROLL_TYPES.find((x) => x.value === p)?.label ?? p : "—";

// Default permission groups (Owner is "Not Applicable" — full access by role).
export const PERMISSION_GROUPS = [
  "Shop Admin",
  "Service Advisor",
  "Technician",
  "Manager",
  "Front Desk",
] as const;

export const ACCESS_TIMES = ["Anytime", "Business hours only"] as const;
