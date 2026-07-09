"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Search, Info, ShieldCheck, Loader2, UserX, UserCheck, ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { cn } from "@/lib/utils";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { listEmployees, setEmployeeActive, bulkAssignPermissionGroup } from "@/server/actions/employees";
import type { EmployeeRow } from "@/server/employees";
import { roleLabel, PERMISSION_GROUPS } from "@/lib/employees";
import { GROUP_PERMISSIONS } from "@/lib/permissions";

type Tab = "employees" | "groups";
const PER_PAGE = 10;

export function EmployeesView({
  initialRows,
  counts,
}: {
  initialRows: EmployeeRow[];
  counts: { active: number; deactivated: number };
}) {
  const [tab, setTab] = useState<Tab>("employees");
  const [active, setActive] = useState(true);
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [rows, setRows] = useState<EmployeeRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkGroup, setBulkGroup] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [, startRefresh] = useTransition();
  const [bulkPending, startBulk] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      listEmployees(active, q, groupFilter || undefined).then((r) => {
        setRows(r);
        setLoading(false);
        setPage(1);
        setSelected(new Set());
      });
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [active, q, groupFilter]);

  const refresh = () =>
    startRefresh(async () => {
      setRows(await listEmployees(active, q, groupFilter || undefined));
      setSelected(new Set());
    });

  const lastPage = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const from = rows.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, rows.length);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.membershipId));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) setSelected(new Set());
    else setSelected(new Set(pageRows.map((r) => r.membershipId)));
  }

  function toggleActive(membershipId: string, to: boolean) {
    setEmployeeActive(membershipId, to).then((res) => { if (res.ok) refresh(); });
  }

  function editPermissions() {
    if (selected.size !== 1) return;
    const id = [...selected][0];
    window.location.href = `/employees/${id}`;
  }

  function applyBulkGroup() {
    setBulkError(null);
    startBulk(async () => {
      const res = await bulkAssignPermissionGroup([...selected], bulkGroup);
      if (res.ok) {
        setBulkGroup("");
        refresh();
      } else setBulkError(res.error);
    });
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold tracking-tight">Employees</h1>

      <nav className={cn(subnavBarClass(), "mb-5")}>
        {([["employees", "Employees"], ["groups", "Permission Groups"]] as [Tab, string][]).map(([k, label]) => (
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

      {tab === "groups" ? <PermissionGroups /> : (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="flex rounded-md border p-0.5">
              {([["active", true], ["deactivated", false]] as [string, boolean][]).map(([label, val]) => (
                <button
                  key={label}
                  onClick={() => setActive(val)}
                  className={cn(
                    "rounded px-3 py-1 text-sm font-medium capitalize transition-colors",
                    active === val ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="ml-1 text-xs text-muted-foreground">({val ? counts.active : counts.deactivated})</span>
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search employees by name, email, or phone"
                className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background py-1 pl-8 pr-8 text-sm"
              >
                <option value="">Permission Group</option>
                {PERMISSION_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={selected.size !== 1}
              onClick={editPermissions}
              title={selected.size !== 1 ? "Select one employee to edit permissions" : "Edit permissions"}
            >
              Edit Permissions
            </Button>

            <AddEmployeeDialog onCreated={refresh} />
          </div>

          {selected.size > 1 ? (
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2 text-sm">
              <span>{selected.size} selected</span>
              <select
                value={bulkGroup}
                onChange={(e) => setBulkGroup(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Assign permission group…</option>
                {PERMISSION_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <Button size="sm" variant="secondary" disabled={!bulkGroup || bulkPending} onClick={applyBulkGroup}>
                {bulkPending ? <Loader2 className="size-4 animate-spin" /> : null} Apply
              </Button>
              {bulkError ? <span className="text-destructive">{bulkError}</span> : null}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="w-10 px-3 py-2">
                    <Checkbox
                      checked={allOnPageSelected ? true : pageRows.some((r) => selected.has(r.membershipId)) ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleSelectAll(v === true)}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Employee Role</th>
                  <th className="px-3 py-2 font-medium">Permission Group</th>
                  <th className="px-3 py-2 font-medium">Access Times</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No {active ? "active" : "deactivated"} employees.</td></tr>
                ) : (
                  pageRows.map((e) => (
                    <tr key={e.membershipId} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={selected.has(e.membershipId)}
                          onCheckedChange={() => toggleSelect(e.membershipId)}
                          aria-label={`Select ${e.name}`}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-medium">
                        <Link href={`/employees/${e.membershipId}`} className="text-primary hover:underline">
                          {e.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">{e.phone ?? "—"}</td>
                      <td className="px-3 py-2.5">{e.email}</td>
                      <td className="px-3 py-2.5">{roleLabel(e.role)}</td>
                      <td className="px-3 py-2.5">
                        {e.permissionGroup ? (
                          e.permissionGroup
                        ) : e.permissionMode === "INDIVIDUAL" ? (
                          <span className="text-muted-foreground">Individual</span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground"><Info className="size-3.5 text-primary" /> Not Applicable</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{e.accessTimes}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => toggleActive(e.membershipId, !e.active)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                          title={e.active ? "Deactivate" : "Reactivate"}
                        >
                          {e.active ? <><UserX className="size-3.5" /> Deactivate</> : <><UserCheck className="size-3.5" /> Reactivate</>}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span>Rows per page: {PER_PAGE}</span>
            <div className="flex items-center gap-2">
              <span>{from}–{to} of {rows.length}</span>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded p-1 hover:bg-accent disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded p-1 hover:bg-accent disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionGroups() {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Permission groups define what an employee can see and do. Assign a group when adding an employee or on their profile.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PERMISSION_GROUPS.map((g) => (
          <div key={g} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <div className="font-medium">{g}</div>
                <div className="text-xs text-muted-foreground">
                  {(GROUP_PERMISSIONS[g] ?? []).length} permissions
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Custom permission group editing (create/edit/delete groups) is coming soon — use Individual Permissions on an employee profile for now.
      </p>
    </div>
  );
}
