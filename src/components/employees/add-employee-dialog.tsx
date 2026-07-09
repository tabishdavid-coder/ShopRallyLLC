"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatPhoneInput } from "@/lib/phone";
import { addEmployee, type AddEmployeeInput } from "@/server/actions/employees";
import { EMPLOYEE_ROLES, PAYROLL_TYPES, ACCESS_TIMES, type EmployeeRoleValue, type PayrollTypeValue } from "@/lib/employees";
import { PermissionsEditor, type PermissionMode } from "@/components/employees/permissions-editor";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

type Form = {
  firstName: string; lastName: string; phone: string; email: string;
  address: string; address2: string; city: string; state: string; zip: string;
  role: EmployeeRoleValue | "";
  payrollType: PayrollTypeValue | "";
  canPerformWork: boolean;
  certificationNumber: string;
  permissionMode: PermissionMode;
  permissionGroup: string;
  permissions: string[];
  accessTimes: string;
};

const EMPTY: Form = {
  firstName: "", lastName: "", phone: "", email: "", address: "", address2: "", city: "", state: "", zip: "",
  role: "", payrollType: "", canPerformWork: true, certificationNumber: "",
  permissionMode: "GROUP", permissionGroup: "", permissions: [], accessTimes: "Anytime",
};

export function AddEmployeeDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  function openDialog() { setF(EMPTY); setStep(1); setError(null); setOpen(true); }

  function next() {
    setError(null);
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("First and last name are required.");
    if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      return setError("Email is an invalid email address. Please check for spaces before or after the address.");
    }
    if (!f.phone.trim()) return setError("Phone is required.");
    if (!f.role) return setError("Select an employee role.");
    if (!f.payrollType) return setError("Select a payroll type.");
    setStep(2);
  }

  function submit() {
    setError(null);
    const isOwner = f.role === "OWNER";
    if (!isOwner && f.permissionMode === "GROUP" && !f.permissionGroup) {
      return setError("Select a permission group.");
    }
    if (!isOwner && f.permissionMode === "INDIVIDUAL" && f.permissions.length === 0) {
      return setError("Select at least one permission.");
    }
    start(async () => {
      const res = await addEmployee({
        firstName: f.firstName, lastName: f.lastName, email: f.email.trim(), phone: f.phone || null,
        address: f.address || null, address2: f.address2 || null, city: f.city || null, state: f.state || null, zip: f.zip || null,
        role: f.role as AddEmployeeInput["role"],
        payrollType: (f.payrollType || null) as AddEmployeeInput["payrollType"],
        canPerformWork: f.canPerformWork,
        certificationNumber: f.certificationNumber || null,
        permissionMode: isOwner ? "GROUP" : f.permissionMode,
        permissionGroup: isOwner ? null : f.permissionMode === "GROUP" ? f.permissionGroup : null,
        permissions: isOwner ? [] : f.permissionMode === "INDIVIDUAL" ? f.permissions : [],
        accessTimes: f.accessTimes,
      });
      if (res.ok) { setOpen(false); onCreated?.(); }
      else setError(res.error);
    });
  }

  const isOwner = f.role === "OWNER";

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setF(EMPTY); setStep(1); setError(null); } }}>
      <Button size="sm" onClick={openDialog} className="gap-1.5">
        <UserPlus className="size-4" /> Add Employee
      </Button>

      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <div className="border-b px-5 py-3.5">
          <DialogTitle className="text-lg font-semibold">Add Employee</DialogTitle>
          <p className="text-sm text-muted-foreground">Step {step} of 2</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 1 ? (
            <div className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Contact Info</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First Name" required><input className={input} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Enter first name" /></Field>
                  <Field label="Last Name" required><input className={input} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Enter last name" /></Field>
                  <Field label="Phone" required><input className={input} value={f.phone} onChange={(e) => set("phone", formatPhoneInput(e.target.value))} placeholder="(555) 555-5555" inputMode="tel" /></Field>
                  <Field label="Email" required>
                    <input className={input} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter email" inputMode="email" />
                  </Field>
                </div>
                <p className="-mt-1 text-xs text-muted-foreground">This email will be used for the employee to login to ShopRally.</p>
                <Field label="Address line 1">
                  <div className="relative">
                    <input className={cn(input, "pr-9")} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Enter address" />
                    <Search className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
                  </div>
                </Field>
                <Field label="Address line 2"><input className={input} value={f.address2} onChange={(e) => set("address2", e.target.value)} placeholder="Enter address" /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City"><input className={input} value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Enter city" /></Field>
                  <Field label="State / Province / Territory">
                    <select className={input} value={f.state} onChange={(e) => set("state", e.target.value)}>
                      <option value="">Select state/province/territory</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Postal Code"><input className={input} value={f.zip} onChange={(e) => set("zip", e.target.value)} placeholder="Enter postal code" /></Field>
              </section>

              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold">Role and Salary</h3>
                <Field label="Employee Role" required>
                  <select className={input} value={f.role} onChange={(e) => set("role", e.target.value as Form["role"])}>
                    <option value="">Select Role</option>
                    {EMPLOYEE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">Role selection will not define this employee&apos;s permissions. You will set permissions separately in the next step.</p>
                </Field>
                <Field label="Payroll Type" required>
                  <select className={input} value={f.payrollType} onChange={(e) => set("payrollType", e.target.value as Form["payrollType"])}>
                    <option value="">Select payroll type</option>
                    {PAYROLL_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={f.canPerformWork} onChange={(e) => set("canPerformWork", e.target.checked)} className="size-4 accent-primary" />
                  Can perform work
                </label>
                <Field label="Certification Number"><input className={input} value={f.certificationNumber} onChange={(e) => set("certificationNumber", e.target.value)} placeholder="Add certification number" /></Field>
              </section>
            </div>
          ) : isOwner ? (
            <div className="space-y-4">
              <p className="rounded-md bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                Owners have full access by role — no permission group is applied (&ldquo;Not Applicable&rdquo;).
              </p>
              <Field label="Access Times">
                <select className={input} value={f.accessTimes} onChange={(e) => set("accessTimes", e.target.value)}>
                  {ACCESS_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              <PermissionsEditor
                mode={f.permissionMode}
                onModeChange={(m) => set("permissionMode", m)}
                permissionGroup={f.permissionGroup}
                onPermissionGroupChange={(g) => set("permissionGroup", g)}
                permissions={f.permissions}
                onPermissionsChange={(p) => set("permissions", p)}
                disabled={pending}
              />
              <Field label="Access Times">
                <select className={input} value={f.accessTimes} onChange={(e) => set("accessTimes", e.target.value)}>
                  {ACCESS_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t px-5 py-3">
          {error ? <span className="text-sm text-rose-600">{error}</span> : null}
          <div className="ml-auto flex gap-2">
            {step === 2 ? <Button variant="ghost" size="sm" onClick={() => { setStep(1); setError(null); }}>Back</Button> : null}
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            {step === 1 ? (
              <Button size="sm" onClick={next}>Next</Button>
            ) : (
              <Button size="sm" onClick={submit} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Create
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label} {required ? <span className="text-rose-500">*</span> : null}</label>
      {children}
    </div>
  );
}
