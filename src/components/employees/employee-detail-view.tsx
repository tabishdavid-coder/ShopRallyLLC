"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, Lock, Pencil, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PermissionsEditor, type PermissionMode } from "@/components/employees/permissions-editor";
import { formatPhoneInput } from "@/lib/phone";
import { roleLabel, payrollLabel, EMPLOYEE_ROLES, PAYROLL_TYPES } from "@/lib/employees";
import {
  updateEmployeeInfo,
  updateEmployeeRole,
  saveEmployeePermissions,
} from "@/server/actions/employees";
import type { EmployeeDetail, LoginEventRow } from "@/server/employees";

const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

type Tab = "permissions" | "notifications" | "history";

export function EmployeeDetailView({ employee, loginHistory }: { employee: EmployeeDetail; loginHistory: LoginEventRow[] }) {
  const [tab, setTab] = useState<Tab>("permissions");
  const [permMode, setPermMode] = useState<PermissionMode>(employee.permissionMode);
  const [permGroup, setPermGroup] = useState(employee.permissionGroup ?? "");
  const [permissions, setPermissions] = useState<string[]>(employee.permissions);
  const [permError, setPermError] = useState<string | null>(null);
  const [permSaved, setPermSaved] = useState(false);
  const [permPending, startPerm] = useTransition();

  const isOwner = employee.role === "OWNER";

  function savePermissions() {
    setPermError(null);
    setPermSaved(false);
    startPerm(async () => {
      const res = await saveEmployeePermissions(employee.membershipId, {
        permissionMode: isOwner ? "GROUP" : permMode,
        permissionGroup: isOwner ? null : permMode === "GROUP" ? permGroup || null : null,
        permissions: isOwner ? [] : permMode === "INDIVIDUAL" ? permissions : [],
      });
      if (res.ok) setPermSaved(true);
      else setPermError(res.error);
    });
  }

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/employees" className="hover:text-primary">Employees</Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{employee.name}</span>
      </nav>

      <div className="space-y-4">
        <InfoCard employee={employee} />
        <RoleCard employee={employee} />

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 pt-3">
            <h2 className="mb-2 font-semibold">Employee Management</h2>
            <nav className={subnavBarClass("w-max min-w-full border-b-0")}>
              {(
                [
                  ["permissions", "Permissions"],
                  ["notifications", "Notifications"],
                  ["history", "History"],
                ] as [Tab, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  aria-current={tab === k ? "page" : undefined}
                  className={subnavTabClass(tab === k, "py-2")}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {tab === "permissions" ? (
              isOwner ? (
                <p className="text-sm text-muted-foreground">
                  Owners have full access by role — permissions are not applicable.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Assign a permission group or individual permissions for this employee.
                    </p>
                    <Button size="sm" onClick={savePermissions} disabled={permPending}>
                      {permPending ? <Loader2 className="size-4 animate-spin" /> : null} Save Permissions
                    </Button>
                  </div>
                  <PermissionsEditor
                    mode={permMode}
                    onModeChange={setPermMode}
                    permissionGroup={permGroup}
                    onPermissionGroupChange={setPermGroup}
                    permissions={permissions}
                    onPermissionsChange={setPermissions}
                    disabled={permPending}
                  />
                  {permError ? <p className="text-sm text-destructive">{permError}</p> : null}
                  {permSaved ? <p className="text-sm text-emerald-700">Permissions saved.</p> : null}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={savePermissions} disabled={permPending}>
                      {permPending ? <Loader2 className="size-4 animate-spin" /> : null} Save Permissions
                    </Button>
                  </div>
                </div>
              )
            ) : tab === "notifications" ? (
              <p className="text-sm text-muted-foreground">
                Employee notification preferences (email/SMS alerts for RO updates, approvals, etc.) — coming soon.
              </p>
            ) : (
              <LoginHistoryTable rows={loginHistory} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ employee }: { employee: EmployeeDetail }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone ?? "",
    email: employee.email,
    address: employee.address ?? "",
    address2: employee.address2 ?? "",
    city: employee.city ?? "",
    state: employee.state ?? "",
    zip: employee.zip ?? "",
  });

  function save() {
    setError(null);
    start(async () => {
      const res = await updateEmployeeInfo(employee.membershipId, {
        ...f,
        phone: f.phone || null,
        address: f.address || null,
        address2: f.address2 || null,
        city: f.city || null,
        state: f.state || null,
        zip: f.zip || null,
      });
      if (res.ok) setEditing(false);
      else setError(res.error);
    });
  }

  const addressLine = [f.address, f.city, f.state, f.zip].filter(Boolean).join(", ");

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Employee info</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled title="Available when Clerk is wired">
            <Lock className="size-3.5" /> Send password reset
          </Button>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="rounded-md p-1.5 hover:bg-accent" aria-label="Edit">
              <Pencil className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name"><Input value={f.firstName} onChange={(e) => setF((p) => ({ ...p, firstName: e.target.value }))} /></Field>
            <Field label="Last name"><Input value={f.lastName} onChange={(e) => setF((p) => ({ ...p, lastName: e.target.value }))} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }))} /></Field>
            <Field label="Email"><Input value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} /></Field>
          </div>
          <Field label="Address"><Input value={f.address} onChange={(e) => setF((p) => ({ ...p, address: e.target.value }))} placeholder="Add address" /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City"><Input value={f.city} onChange={(e) => setF((p) => ({ ...p, city: e.target.value }))} /></Field>
            <Field label="State"><Input value={f.state} onChange={(e) => setF((p) => ({ ...p, state: e.target.value }))} /></Field>
            <Field label="Zip"><Input value={f.zip} onChange={(e) => setF((p) => ({ ...p, zip: e.target.value }))} /></Field>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={pending}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Save</Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Info label="Employee name" value={employee.name} />
          <Info label="Phone" value={employee.phone ?? "—"} />
          <Info label="Email" value={employee.email} />
          <Info label="Address" value={addressLine || "Add address"} muted={!addressLine} />
        </dl>
      )}
    </div>
  );
}

function RoleCard({ employee }: { employee: EmployeeDetail }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    role: employee.role,
    payrollType: employee.payrollType ?? "",
    canPerformWork: employee.canPerformWork,
    certificationNumber: employee.certificationNumber ?? "",
    accessTimes: employee.accessTimes,
  });

  function save() {
    setError(null);
    start(async () => {
      const res = await updateEmployeeRole(employee.membershipId, {
        role: f.role,
        payrollType: (f.payrollType || null) as "SALARY" | "FLAT_RATE" | "HOURLY" | null,
        canPerformWork: f.canPerformWork,
        certificationNumber: f.certificationNumber || null,
        accessTimes: f.accessTimes,
      });
      if (res.ok) setEditing(false);
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Role &amp; salary</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="rounded-md p-1.5 hover:bg-accent" aria-label="Edit">
            <Pencil className="size-4" />
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="space-y-3">
          <Field label="Role">
            <select className={input} value={f.role} onChange={(e) => setF((p) => ({ ...p, role: e.target.value as typeof f.role }))}>
              {EMPLOYEE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Payroll type">
            <select className={input} value={f.payrollType} onChange={(e) => setF((p) => ({ ...p, payrollType: e.target.value }))}>
              <option value="">N/A</option>
              {PAYROLL_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.canPerformWork} onChange={(e) => setF((p) => ({ ...p, canPerformWork: e.target.checked }))} className="size-4 accent-primary" />
            Can perform work
          </label>
          <Field label="Certification number">
            <Input value={f.certificationNumber} onChange={(e) => setF((p) => ({ ...p, certificationNumber: e.target.value }))} placeholder="Add cert number" />
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={pending}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Save</Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Info label="Role" value={roleLabel(employee.role)} />
          <Info label="Payroll type" value={payrollLabel(employee.payrollType)} />
          <Info label="Commission Structure" value="None" />
          <Info label="Can perform work" value={employee.canPerformWork ? "Yes" : "No"} />
          <Info label="Certification Number" value={employee.certificationNumber ?? "Add cert number"} muted={!employee.certificationNumber} />
        </dl>
      )}
    </div>
  );
}

function LoginHistoryTable({ rows }: { rows: LoginEventRow[] }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter(
    (r) =>
      !q.trim() ||
      r.ipAddress?.includes(q) ||
      r.userAgent?.toLowerCase().includes(q.toLowerCase()) ||
      r.loggedInAt.includes(q),
  );

  return (
    <div>
      <div className="relative mb-3 max-w-md">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search login history for this employee" className="pl-3" />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Login Date</th>
              <th className="px-3 py-2 font-medium">IP Address</th>
              <th className="px-3 py-2 font-medium">User Agent</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No login history.</td></tr>
            ) : (
              filtered.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 tabular-nums">{formatLoginDate(r.loggedInAt)}</td>
                  <td className="px-3 py-2">{r.ipAddress ?? "—"}</td>
                  <td className="max-w-md truncate px-3 py-2 text-muted-foreground" title={r.userAgent ?? undefined}>{r.userAgent ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 10 ? (
        <p className="mt-2 text-xs text-muted-foreground">Showing 10 of {filtered.length} login events.</p>
      ) : null}
    </div>
  );
}

function Info({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function formatLoginDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
